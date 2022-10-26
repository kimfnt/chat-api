const socket = io()
var actualRoom = undefined;
var limit = 1;

var keys = []

var listConv = []

$("#menu-area").fadeOut();
$("#chat-area").fadeOut();


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

// Connects automatically if id and token are already in the url
document.getElementById('id').value = new URLSearchParams(window.location.search).get('id')
document.getElementById('token').value = new URLSearchParams(window.location.search).get('token')
if (document.getElementById('id').value != "" && document.getElementById('token').value != "") checkToken()

/**
 * function to open conversation on press
 */
function openRoom(roomId) {
    socket.emit('open room', roomId);
    socket.emit('read conv', roomId)
}

/**
 * function to join a 1to1 room with another user on button press
 */
function join1to1Room() {
    let userId = $("#select-user option:selected").val();
    socket.emit('create 1to1 room', userId);
};

/**
 * function to create a group room on button press
 */
function createGroupRoom() {
    let name = $("input#group-name").val();
    socket.emit('create group room', name);
};

/**
 * function to join a group room with url (roomId) on button press
 */
function joinGroupRoom() {
    let roomURL = $("input#group-url").val();
    socket.emit('join group room', roomURL);
};

/**
 * function to leave room on button press
 */
function leaveRoom() {
    socket.emit('leave room', actualRoom)
}

/**
 * function to kick user on button press (for admin only)
 * @param {String} userId is od the user we want to kick
 */
function kickUser(userId) {
    socket.emit('kick user', userId);
}

/**
 * function to quit conversation to return to dashboard on button press
 */
function quitRoom() {
    if (listConv[actualRoom]) socket.emit('read conv', actualRoom)

    limit = 1;
    actualRoom = undefined;

    // remove html elements
    $("#menu-area").fadeIn();
    $("#chat-area").fadeOut();

    $(".msger-chat").empty();
    $("#convo").empty();
    $("ol#list-user").empty();
    $('.msger-header-title').find('span').remove();
    displayListConv();
};

/**
 * listens to enter keypress in chat area to send message
 */
document.querySelector('#msger-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

/**
 * function to send message and append it
 */
function sendMessage() {
    let message = $('#msger-input').val();
    let select = $("#types").val();
    let url = $("#msger-input-media").val();
    let encryptedMessage = encryptWithAESKey(message, keys[actualRoom])

    if (select == "none" && message != "") {
        socket.emit("send message", { message: encryptedMessage })
    } else if (select != "none" && url != "") {
        message = " "
        encryptedMessage = encryptWithAESKey(message, keys[actualRoom])
        socket.emit("send message", { message: encryptedMessage, type: select, messageURL: url })
    }

    $('#msger-input').val("");
    $("#types").prop('selectedIndex', 0);
    $("#msger-input-media").val("");
};

/**
 * function to reply to a message on button press
 * @param {String} parentId id of the message we want to reply to
 */
function replyMessage(parentId) {
    let message = $('#msger-input').val();
    let select = $("#types").val();
    let url = $("#msger-input-media").val();
    let encryptedMessage = encryptWithAESKey(message, keys[actualRoom])
    if (message != "") {
        if (select == "none") {
            socket.emit("send message", { message: encryptedMessage, parentId: parentId })
        } else if (select != "none" && url != "") {
            socket.emit("send message", { message: encryptedMessage, type: select, messageURL: url, parentId: parentId })
        }
    }
    $('#msger-input').val("");
    $("#types").prop('selectedIndex', 0);
    $("#msger-input-media").val("");
}

/**
 * function to disconnect socket (similar to when user leaves chat tab on Manao)
 */
function disconnectUser() {
    console.log("disconnect");
    $("#convo").empty();
    $('#select-user').empty();
    $("#menu-area").fadeOut();
    $("#login-area").fadeIn();
    socket.disconnect();
}

/**
 * function to get older messages on button press
 */
function getOlder() {
    limit += 1;
    $(".msger-chat").empty()

    socket.emit('get message', ({ limit }));
};


/**
 * function to refresh conversations on the dashboard
 */
function refreshConversations() {
    $("#convo").empty();
    displayListConv();
}


function getMoreConversations() {
    $("#convo").empty();
    //socket.emit('get-list-conversations');
}

/**
 * function to generate invitation link (admin only)
 */
function generateLink() {
    $('#qrcode').empty();
    $("#invite-link").text("");
    let date = $("input#date").val();
    if (date != "") {
        socket.emit('create URL', date);
    }
    else {
        socket.emit('create URL', "default");
    }
};

/**
 * function to change name of group room (admin only)
 */
function changeName() {
    let newName = $("#new-name").val();
    if (newName != "") {
        socket.emit('change group name', (newName));
    }
    $("#new-name").val('');

};

/**
 * function to set notifications value for the conversation
 */
function getNotifications() {
    let notification;
    if ($('#notification-checkbox').prop("checked") == true) {
        notification = true;
    } else {
        notification = false;
    }
    socket.emit('change notifications', notification);
};

/**
 * function to encrypt message with AES key
 * @param {String} msg text message to encrypt
 * @param {String} key AES key of the room
 * @returns the encrypted message
 */
function encryptWithAESKey(msg, key) {
    return CryptoJS.AES.encrypt(msg, key).toString();
}

/**
 * function to decrypt message with AES key
 * @param {String} msg text message to decrypt
 * @param {String} key AES key of the room
 * @returns the decrypted message 
 */
function decryptWithAESKey(msg, key) {
    const decrypted = key ? CryptoJS.AES.decrypt(msg, key) : null
    if (decrypted) {
        try {
            const str = decrypted.toString(CryptoJS.enc.Utf8);
            if (str.length > 0) {
                return str;
            } else {
                return msg;
            }
        } catch (e) {
            return msg;
        }
    }
    return msg;
}

/**
 * function to display conversations of users on the dashboard
 */
function displayListConv() {
    // La première partie permet de trier les messages dans l'ordre d'envoi !
    var items = Object.keys(listConv).map(
        (key) => { return [key, listConv[key].createdAt] });

    items.sort(
        (first, second) => { return new Date(second[1]) - new Date(first[1]) }
    );


    var ordered = items.map(
        (e) => { return e[0] });

    $("#convo").empty();
    ordered.forEach((key) => {
        let item = listConv[key]

        let name = item.roomName;
        let time = item.createdAt;
        let text = ""
        let sender = "";

        if (item.type == '1') {
            text = item.senderName;
        }
        else if (item.userId == socket.auth.id) sender = "You : ";
        else sender = item.senderName + " : ";

        text += decryptWithAESKey(item.message, keys[item.roomId]);

        time = new Date(time);
        let today = new Date();
        if (time.getDate() == today.getDate()) {
            let hours = String(time.getHours()).padStart(2, '0');
            let minutes = String(time.getMinutes()).padStart(2, '0');
            time = hours + ":" + minutes;
        } else {
            let dd = String(time.getDate()).padStart(2, '0');
            let mm = String(time.getMonth() + 1).padStart(2, '0');
            let yyyy = time.getFullYear();
            time = dd + '/' + mm + '/' + yyyy;
        }
        $('#convo').append(
            '<li>' +
            '<div id="convo-items" value=' + item.roomId + ' onclick="openRoom(this.getAttribute(`value`))">' +
            '<div id="convo-info">' +
            (item.nbNotifications == 0 ? '' : '<span id="notifications">' + item.nbNotifications + '</span>') +
            '<span id="conv-name">' + name + '</span>' +
            '<span id="message-time">' + time + '</span>' +
            '</div>' +
            '<div id="last-message">' +
            '<span id="sender">' + sender + '</span>' +
            '<span id="message-text">' + text + '</span>' +
            '</div>' +
            '</div>' +
            '</li>')
    })
}

function updateListConv(message) {
    listConv[message.roomId].id = message._id;
    listConv[message.roomId].tagIds = message.tagIds;
    listConv[message.roomId].message = message.message;
    listConv[message.roomId].createdAt = message.createdAt;
    listConv[message.roomId].senderName = message.name;
    listConv[message.roomId].userId = message.userId;
    listConv[message.roomId].type = message.type;
    listConv[message.roomId].nbNotifications += 1
    displayListConv();
}

function updateName(roomId, name) {
    listConv[roomId].roomName = name;
    displayListConv();
}

function readConv(roomId) {
    listConv[roomId].nbNotifications = 0
    displayListConv();
}

/**
 * function to get members in the room on button press
 */
function getMembersInRoom() {
    socket.emit('get members in room');
}

/**
 * function to delete a message
 * @param {String} messageId id of the message we want to delete
 */
function deleteMessage(messageId) {
    socket.emit('delete message', messageId);
}

// Une fois connecté
socket.on('connect', data => {
    console.log('established connection');

    // show dashboard instead of login page
    $("#login-area").fadeOut();
    $("#menu-area").fadeIn();


    socket.on('response-list-user', (listUsers) => {
        $.each(listUsers, function (i, item) {
            $('#select-user').append($('<option>', {
                value: item._id,
                text: item.name
            }));
        });
    });

    socket.on('set keys', (sendkeys) => {
        keys = sendkeys;
        socket.emit('get all conversations'); // Once the keys are retrived
    })

    socket.on('add key', ({ key, id }) => {
        keys[id] = key;
    });

    // populate recent conversations
    socket.on('set all conversations', listConversations => {
        $.each(listConversations, function (i, item) {
            listConv[item.roomId] = item;
        })
        displayListConv();
    })

    socket.on('add conversation', conversation => {
        listConv[conversation.roomId] = conversation;
        displayListConv();
    })




    // display previous messages from conversation
    socket.on('print message', async (messages) => {
        let length = Object.keys(messages.messages).length
        if (length > 0) {
            messages.messages.forEach(item => {
                if (item.type == '1') printMessageBot(item)
                else if (item.userId === socket.auth.id) printMessageSent(item)
                else printMessageReceived(item)
            });

        };
        $("#menu-area").fadeOut();
        document.querySelector('.msger-chat li:last-child').scrollIntoView();
    });

    // enter a one to one room
    socket.on('enter 1to1 room', ({ roomId, userId }) => {
        console.log("Joined 1on1 room " + roomId + "with" + userId);
        actualRoom = roomId;
        socket.emit('get message', ({ limit }));
        $('.msger-header-title').append('<span>' + userId + '</span>');
        $("#chat-area").fadeIn();
        $("#invite").fadeOut();
        $("#rename").fadeOut();
        $("#leave").fadeOut();
        $("#list-user").fadeOut();
    });

    // enter a group room
    socket.on('enter group room', ({ name, roomId }) => {
        actualRoom = roomId;
        let displayed = name = "" ? roomId : name;
        console.log("Joined room " + displayed);
        $('.msger-header-title').append('<span>' + displayed + '</span>');

        socket.emit('get message', ({ roomId, limit }));
        $("#chat-area").fadeIn();
        $("#invite").fadeOut();
        $("#rename").fadeOut();
        $("#list-user").fadeIn();
        $("#leave").fadeIn();
        socket.emit("is user admin")
    });

    socket.on("is admin", (answer) => {
        $("#invite").fadeIn();
        $("#rename").fadeIn();
        $(".kick-button").fadeIn("fast");
    })

    // when a message is sent from another user, a bot, or the user themself
    socket.on('receive message', ({ message, user }) => {
        if (user.roomId == actualRoom) {
            if (message.type == '1') printMessageBot(message)
            else if (message.userId == socket.auth.id) printMessageSent(message)
            else printMessageReceived(message)
        }
        updateListConv(message)
    });

    socket.on('hide message', ({ messageId, roomId }) => {
        if (actualRoom == roomId) {
            let el = document.querySelector('[class="msg"][value="' + messageId + '"]').querySelector('p')
            el.innerHTML = "<i> Message supprimé </i>"
        }
        if (listConv[roomId].id) {
            listConv[roomId].message = "<i> Message supprimé </i>"
            displayListConv();

        }
    })

    // If a room name is changed
    socket.on('update room name', (room) => {
        if (room._id == actualRoom) {
            $('.msger-header-title').find('span').text(room.name);
        }
        updateName(room._id, room.name)
    })

    // when you wish to join a room you are already in
    socket.on('group room already joined', () => {
        alert("You have already joined this room");
    });

    socket.on('has read conv', roomId => {
        if (listConv[roomId]) listConv[roomId].nbNotifications = 0
        displayListConv();
    })


    socket.on('has left room', () => {
        delete (listConv[actualRoom])
        quitRoom();
    })

    socket.on('get url', async(generatedURL) => {
        $("#invite-link").text(generatedURL);
        var qrcode = new QRCode("qrcode", {
            width: 160,
            height: 160,
        });
        qrcode.makeCode(generatedURL);
    })

    socket.on("display notifications", (notification) => {
        $('#notification-checkbox').prop("checked", notification);
    });


    socket.on('display members in room', (members) => {
        $("ol#list-user").empty();
        let count = 0;
        for (const member of members) {
            let date = new Date(member.createdAt);
            let dd = String(date.getDate()).padStart(2, '0');
            let mm = String(date.getMonth() + 1).padStart(2, '0');
            let yyyy = date.getFullYear();
            date = dd + '/' + mm + '/' + yyyy;
            let name = member.name;
            let id = member.userId;
            let role = member.role;

            if (role == "admin") {
                $('ol#list-user').append(
                    '<li>' +
                    '<div class="user-item">' +
                    '<span id="admin">' + name + '</span>' +
                    '<span>' + date + '</span>' +
                    '</div>' +
                    '</li>');
            } else {
                $('ol#list-user').append(
                    '<li>' +
                    '<div class="user-item">' +
                    '<span>' + name + '</span>' +
                    '<span>' + date + '</span>' +
                    '</div>' +
                    '<button class="kick-button" value=' + id + ' onclick="kickUser(this.getAttribute(`value`))">' +
                    '<i class="fa fa-trash fa-lg"></i>' +
                    '</button>' +
                    '</li>');
            }
            count++;
            $("#total").text("Total users : " + count + "/64");
        }
        $(".kick-button").fadeOut("fast");
        socket.emit("is user admin")
    });
})

// when the socket is disconnected
socket.on('disconnect', data => {
    console.log('lost connection');
})

function printMessageBot(message) {
    $('.msger-chat').append(
        '<li class="bot">' +
        '<div class="msg" value=' + message._id + '>' +
        '<p>' + message.name + " " + message.message + '</p>' +
        '</div>' +
        '</li>');
}

function printMessageSent(message) {
    let decrypted = decryptWithAESKey(message.message, keys[actualRoom])
    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;

    switch (message.type) {
        case "-1":
            $(".msger-chat").append(
                '<li class="self">' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '<i class="fa fa-trash fa-lg" value=' + message._id + ' onclick="deleteMessage(this.getAttribute(`value`))"></i>' +
                '<div class="msg" value=' + message._id + '>' +
                '<p>' + decrypted + '</p>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '</li>');
            break;
        case "0":
            $(".msger-chat").append(
                '<li class="self">' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '<i class="fa fa-trash fa-lg" value=' + message._id + ' onclick="deleteMessage(this.getAttribute(`value`))"></i>' +
                '<div class="msg" value=' + message._id + '>' +
                '<p>' + decrypted + '</p>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '</li>');
            break;
        case "2":
            $(".msger-chat").append(
                '<li class="self">' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '<i class="fa fa-trash fa-lg" value=' + message._id + ' onclick="deleteMessage(this.getAttribute(`value`))"></i>' +
                '<div class="msg" value=' + message._id + '>' +
                '<p>' + decrypted + '</p>' +
                '<image src=' + message.URL + '>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '</li>');
            break;
        case "3":
            $(".msger-chat").append(
                '<li class="self">' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '<i class="fa fa-trash fa-lg" value=' + message._id + ' onclick="deleteMessage(this.getAttribute(`value`))"></i>' +
                '<div class="msg" value=' + message._id + '>' +
                '<p>' + decrypted + '</p>' +
                '<video width="400" controls>' +
                '<source src=' + message.URL + '>' +
                '</video>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '</li>');
            break;
        case "4":
            $(".msger-chat").append(
                '<li class="self">' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '<i class="fa fa-trash fa-lg" value=' + message._id + ' onclick="deleteMessage(this.getAttribute(`value`))"></i>' +
                '<div class="msg" value=' + message._id + '>' +
                '<p>' + decrypted + '</p>' +
                '<audio controls>' +
                '<source src=' + message.URL + '>' +
                '</audio>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '</li>');
            break;
        default:
            console.log("unknown type")
    }

    // document.getElementById('msger-input').value = "";
    document.querySelector('.msger-chat li:last-child').scrollIntoView();
}

function printMessageReceived(message) {

    let decrypted = decryptWithAESKey(message.message, keys[actualRoom])
    let date = new Date();
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    switch (message.type) {
        case "-1":
            $('.msger-chat').append(
                '<li class="field">' +
                '<div class="msg" value=' + message._id + ' >' +
                '<span>' + message.name + ':</span>' +
                '<p>' + decrypted + '</p>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '</li>');
            break;
        case "0":
            $('.msger-chat').append(
                '<li class="field">' +
                '<div class="msg" value=' + message._id + ' >' +
                '<span>' + message.name + ':</span>' +
                '<p>' + decrypted + '</p>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '</li>');
            break;
        case "2":
            $('.msger-chat').append(
                '<li class="field">' +
                '<div class="msg" value=' + message._id + ' >' +
                '<span>' + message.name + ':</span>' +
                '<p>' + decrypted + '</p>' +
                '<image src=' + message.URL + '>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '</li>');
            break;
        case "3":
            $('.msger-chat').append(
                '<li class="field">' +
                '<div class="msg" value=' + message._id + ' >' +
                '<span>' + message.name + ':</span>' +
                '<p>' + decrypted + '</p>' +
                '<video width="400" controls>' +
                '<source src=' + message.URL + '>' +
                '</video>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '</li>');
            break;
        case "4":
            $('.msger-chat').append(
                '<li class="field">' +
                '<div class="msg" value=' + message._id + ' >' +
                '<span>' + message.name + ':</span>' +
                '<p>' + decrypted + '</p>' +
                '<audio controls>' +
                '<source src=' + message.URL + '>' +
                '</audio>' +
                '<time>' + hours + ':' + minutes + '</time>' +
                '</div>' +
                '<i class="fa fa-reply fa-lg" value=' + message._id + ' onclick="replyMessage(this.getAttribute(`value`))"></i>' +
                '</li>');
            break;
        default:
            console.log("unknown type")
    }

    document.querySelector('.msger-chat li:last-child').scrollIntoView();
}