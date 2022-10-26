import swaggerAutogen from 'swagger-autogen'


const outputFile = './swagger_output.json'
const endpointsFiles = ['./index.js']

const doc = {
    info: {
        version: "0.1.0",
        title: "Chat-App",
        title: 'REST API',
        description: "Documentation automatically generated for <b>Manao chat app</b>."
    },
    host: 'localhost:8080',
    tags: [
        {
            name: "login",
            description: "login management",
        },
        {
            name: "users",
            description: "users management",
        },
        {
            name: "rooms",
            description: "rooms management",
        },
        {
            name: "members",
            description: "members management"
        }
    ],
    "definitions": {
        "User": {
            "$_id": "28dcc46ffe144376ab7dd9c606c92d63",
            "$token": "15468245b7631245182a4579854301586",
            "name": "Juan Doe",
            "createdAt": "2022-02-26T16:37:48.244Z",
            "updatedAt": "2022-02-27T52:40:45.232Z"
        },
        "Room": {
            "$_id": "33efeb1e16ea40a1ab59ac4870c493e0",
            "$type": "1on1",
            "$adminId": "128dcc46ffe144376ab7dd9c606c92d63",
            "status": "active",
            "name": "Projet PING-Manao",
            "key": "1a5d2e5648bfd4e298ebcadf452e6a32",
            "url": "localhost:8080/join/xxxxxxx",
            "urlMaxDate": "2022-01-10T05:10:10.099Z",
            "createdAt": "2022-02-26T16:37:48.244Z",
            "updatedAt": "2022-02-27T52:40:45.232Z"
        },
        "Member": {
            "$_userId": {
                $ref: '#/definitions/User'
            },
            "$roomId": {
                $ref: '#/definitions/Room'
            },
            "role": "admin",
            "notifications": true,
            "numberNotifications": 15,
            "createdAt": "2022-02-26T16:37:48.244Z",
            "updatedAt": "2022-02-27T52:40:45.232Z"
        },
        "Message": {
            "_id": "6b2a34cd20734e0aba518f5833dc8881",
            "$type": "-1 : Message supprimé, 0 : Message utilisateur, 1 : Message bot (join/quit), 2 : URL S3 AWS",
            "$userId": "e2eeb6d5bd3b45cf858d04d630da3b66",
            "$roomId": "33efeb1e16ea40a1ab59ac4870c493e0",
            "message": "This is an encrypted message !",
            "parentId": "44cbbb3577264cf8bf8f0bfffaaa1d51",
            "URL": "https://www.w3schools.com/images/w3lynx_200.png",
            "tagIds": ["e2eeb6d5bd3b45cf858d04d630da3b66", "28dcc46ffe144376ab7dd9c606c92d63"],
            "createdAt": "2022-02-26T16:37:48.244Z",
            "updatedAt": "2022-02-27T52:40:45.232Z"
        }
    }
}

swaggerAutogen()(outputFile, endpointsFiles, doc).then(async () => {
    await import('./index.js');           // Your project's root file
})
