function main() {
    const clientID = '8595554f0beba16a71cde23a6fd8c40bdc6e5ee38d706babe5e52f69999d7572'
    const redirectURL = 'https://martindstone.github.io/PDOAuth/index_manual.html'

    token = sessionStorage.getItem('pd_access_token')

    if ( !token ) {
        // if there is no token stored, do a PKCE flow to get one
        const urlParams = new URLSearchParams(window.location.search)

        if ( urlParams.get('code') ) {
            // do PKCE Leg 3: Exchange Auth Code For Access Token
            const code = urlParams.get('code')
            const codeVerifier = sessionStorage.getItem('code_verifier')

            if ( codeVerifier ) {
                PDOAuth.exchangeCodeForToken(clientID, redirectURL, codeVerifier, code).then((retrieved_token) => {
                    if (retrieved_token) {
                        // Success! Save the access token, remove the code verifier, and reload
                        sessionStorage.setItem('pd_access_token', retrieved_token)
                        sessionStorage.removeItem('code_verifier')
                        // load the page without the code= parameter
                        location.assign(`${location.protocol}//${location.host}${location.pathname}`)
                    } else {
                        console.log('Could not retrieve an access token!')
                    }
                })
            } else {
                console.log('Received an auth code but no code verifier was stored!')
            }
        } else if ( urlParams.get('error') ) {
            // PKCE flow stopped at Leg 2: couldn't obtain an auth code
            const error = urlParams.get('error')
            const errorDescription = urlParams.get('error_description')

            console.log(`Error obtaining an auth code: ${error} - ${errorDescription}`)
        } else {
            // do PKCE flow Leg 1
            const codeVerifier = PDOAuth.createCodeVerifier()

            sessionStorage.setItem('code_verifier', codeVerifier)
            PDOAuth.getAuthURL(clientID, redirectURL, codeVerifier).then((url) => {
                document.getElementById("pd-login-button").href = url
            })
        }
        return
    }

    $('.token').html(token)
    new ClipboardJS('.btn-clipboard')
    $('#content').show()

    /////////////////////////////
    //
    // You can make a logout button (just clears the token from session storage):
    //
    $('#pd-login-button').html('Log Out')
    $('#pd-login-button').attr('href', `${location.protocol}//${location.host}${location.pathname}`)
    $('#pd-login-button').click(() => {
        PDOAuth.logout()
    })
}
$(document).ready(main);