function main() {
    const clientID = '8595554f0beba16a71cde23a6fd8c40bdc6e5ee38d706babe5e52f69999d7572'

    /////////////////////////////
    //
    // you can set the redirect URL, or let PDOAuth assume that it's the current page:
    //
    // const redirectURL = 'https://martindstone.github.io/PDOAuth'

    /////////////////////////////
    //
    // PDOAuth.login will overwrite the DOM with a simple login button, with the
    // provided client ID and redirect URL. It will store a PKCE code verifier in
    // session storage, and on success it will store the PD access token in
    // session storage.
    //
    // Calling with just client ID:
    //
    PDOAuth.login(clientID)
    //
    // Calling with client ID and redirect URL:
    //
    // PDOAuth.login(clientID, redirectURL)

    /////////////////////////////
    //
    // after calling PDOauth.login, you can just look for token in session storage:
    //
    token = sessionStorage.getItem('pd_access_token')
    $(".token").html(token)
    new ClipboardJS('.btn-clipboard')

    /////////////////////////////
    //
    // You can make a logout button (just clears the token from session storage):
    //
    $('#pd-logout-button').attr('href', '#')
    $('#pd-logout-button').click(() => {
        PDOAuth.logout() 
    })
}
$(document).ready(main);