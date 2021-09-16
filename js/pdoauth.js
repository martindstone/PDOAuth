/////////////////////////////
//
// PDOAuth - implementation of PKCE OAuth flow for PagerDuty
//
// Two ways to use:
//
// Simple:
//
// Just call PDOAuth.login(clientID) in your page, and let the library
// write the login button into your current DOM and store the token in your
// session storage.
//
// Manual:
//
// Get a PKCE code verifier and save it somewhere, like session storage:
//    const codeVerifier = PDOAuth.createCodeVerifier()
//    sessionStorage.setItem('code_verifier', codeVerifier)
//
// Get a PD login URL and make it be the destination of some link or button in your page:
//    PDOAuth.getAuthURL(clientID, redirectURL, codeVerifier).then((url) => {
//        document.getElementById("pd-login-button").href = url
//    })
//
// If the user completes the OAuth flow on the PD side, they will be directed back to
// your redirect URL with a code parameter in the query string, that you can exchange
// for a PD access token:
//    PDOAuth.exchangeCodeForToken(clientID, redirectURL, codeVerifier, code).then((token) => {
//        // Do stuff using the token...
//    }
//
// See the examples at https://github.com/martindstone/PDOAuth for more details!
//
(function() {
	window.PDOAuth = (function() {
		class PDOAuth {
			static gen64x8bitNonce() {
			    const array = new Uint8Array(64); //( generate 1024bits 8*128
			    window.crypto.getRandomValues(array);
			    return array;
			};

			static async digestVerifier(vString) {
			    const encoder = new TextEncoder();
			    const verifier = encoder.encode(vString);
			    const hash = await crypto.subtle.digest('SHA-256', verifier);
			    return hash;
			}

			static base64Unicode(buffer) {
			    // |*|  Base64 / binary data / UTF-8 strings utilities (#1)
			    // |*|  https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
			    // |*|  Author: madmurphy
			    const uint6ToB64 = function(nUint6) {
			        return nUint6 < 26 ?
			            nUint6 + 65 :
			            nUint6 < 52 ?
			            nUint6 + 71 :
			            nUint6 < 62 ?
			            nUint6 - 4 :
			            nUint6 === 62 ?
			            43 :
			            nUint6 === 63 ?
			            47 :
			            65;
			    }
			    const base64EncArr = function(aBytes) {
			        let eqLen = (3 - (aBytes.length % 3)) % 3,
			            sB64Enc = "";

			        for (let nMod3, nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
			            nMod3 = nIdx % 3;
			            /* Uncomment the following line in order to split the output in lines 76-character long: */
			            /*
			            if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
			            */
			            nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
			            if (nMod3 === 2 || aBytes.length - nIdx === 1) {
			                sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
			                nUint24 = 0;
			            }
			        }
			        return eqLen === 0 ?
			            sB64Enc :
			            sB64Enc.substring(0, sB64Enc.length - eqLen) + (eqLen === 1 ? "=" : "==");
			    };
			    let encodedArr = base64EncArr(new Uint8Array(buffer));
			    // manually finishing up the url encoding fo the encodedArr
			    encodedArr = encodedArr.replace(/\+/g, '-')
			        .replace(/\//g, '_')
			        .replace(/=/g, '');
			    return encodedArr;
			}

			static createCodeVerifier() {
			    // generate code verifier
			    const generatedCode = this.gen64x8bitNonce();
			    // base64 encode code_verifier
			    return this.base64Unicode(generatedCode.buffer);
			}

			static async getAuthURL(clientID, redirectURL, codeVerifier) {
			    const challengeBuffer = await this.digestVerifier(codeVerifier);
			    // base64 encode the challenge
			    const challenge = this.base64Unicode(challengeBuffer);
			    // build authUrl
			    const authUrl = `https://app.pagerduty.com/oauth/authorize?` +
			        `client_id=${clientID}&` +
			        `redirect_uri=${redirectURL}&` +
			        `response_type=code&` +
			        `code_challenge=${encodeURI(challenge)}&` +
			        `code_challenge_method=S256`

			    return authUrl
			}

			static async exchangeCodeForToken(clientID, redirectURL, codeVerifier, code) {
			    let requestTokenUrl = `https://app.pagerduty.com/oauth/token?` +
			        `grant_type=authorization_code&` +
			        `code=${code}&` +
			        `redirect_uri=${redirectURL}&` +
			        `client_id=${clientID}&` +
			        `code_verifier=${codeVerifier}`
			    let data = await postData(requestTokenUrl, {})
		        if (data.access_token) {
		        	return data.access_token
		        } else {
		        	console.log("Error in response from PD:", data)
		        }

			    function postData(url, data) {
			        return fetch(url, {
			                method: 'POST'
			            })
			            .then(response => response.json())
			    }
			}

			static writeLoginPage(clientID, redirectURL) {
                const title = document.title
				document.write(
				`
                <title>${title}</title>
				<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" rel="stylesheet">
                <div align="center">
                    <p>&nbsp;</p>
                    <h2>PagerDuty Login</h2>
                    <i>Connect to PagerDuty to use <b>${title}</b></i>
                    <p>&nbsp;</p>
                    <a id="pd-login-button" class="btn btn-lg btn-primary auth-button">
                        Authorize PagerDuty
                    </a>
                </div>
				`
				)
		        let codeVerifier = PDOAuth.createCodeVerifier()
		        sessionStorage.setItem('code_verifier', codeVerifier)

		        PDOAuth.getAuthURL(clientID, redirectURL, codeVerifier).then((url) => {
		            document.getElementById("pd-login-button").href = url
		        })
			}

			static login(clientID, redirectURL_param) {
                if ( sessionStorage.getItem('pd_access_token') ) {
                    return
                }

			    const urlParams = new URLSearchParams(window.location.search)
			    let redirectURL = redirectURL_param
			    if ( !redirectURL ) {
			    	// assume that the redirect URL is the current page
			    	redirectURL = `${location.protocol}//${location.host}${location.pathname}`
			    }
			    
			    let code = urlParams.get('code')
			    let codeVerifier = sessionStorage.getItem('code_verifier')
			    if (code && codeVerifier) {
			        PDOAuth.exchangeCodeForToken(clientID, redirectURL, codeVerifier, code).then((token) => {
			        	if (token) {
			        		sessionStorage.setItem('pd_access_token', token)
			        		sessionStorage.removeItem('code_verifier')
			        		location.assign(redirectURL)
			        	} else {
			        		PDOAuth.writeLoginPage(clientID, redirectURL)
			        	}
			        })
			    } else {
			    	PDOAuth.writeLoginPage(clientID, redirectURL)
			    }
			}

            static logout() {
                sessionStorage.removeItem('pd_access_token')
                location.reload()
            }
		}
		return PDOAuth
	}).call(this)
}).call(this)
