const socket = io()

/**
 * function to identify user at login
 */
function checkToken() {
    // get informations from input
    let id = document.getElementById('id').value;
    let token = document.getElementById('token').value;
    socket.auth = {
        id: id,
        token: token
    }
    socket.connect();
};

function joinRoom() {
    const roomURL = new URLSearchParams(window.location.search).get('url')
    console.log(roomURL)

    socket.emit('join group room', roomURL)
    location.replace("http://localhost:8080/?id="+socket.auth.id+"&token="+socket.auth.token)
};



// Une fois connecté
socket.on('connect', data => {
    console.log(socket.auth);
})
