var WebSocketServer = require('websocket').server;
var http = require('http');
var URL = require('url');

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(666);
    response.end();
});

server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

var sessions = {};

var pendingRequests = {};

function initSession(id) {
    sessions[id] = {
        deviceConnection: null,
        clientConnection: null
    }
}

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept('remote-bridge-protocol', request.origin);

    var urlInfo = URL.parse(request.httpRequest.url, true);
    var action = urlInfo.pathname;
    var id = urlInfo.query["id"];

    if (action === "/create") {

        if (!sessions[id]) {
            initSession(id);
        }

        sessions[id].deviceConnection = connection;
        if (pendingRequests[id]) {
            pendingRequests[id].forEach(function (message) {
                console.log('Send pending message ' + message.utf8Data);
                if (sessions[id].deviceConnection) {
                    sessions[id].deviceConnection.sendUTF(message.utf8Data)
                }
            });
            pendingRequests[id] = null;
        }

        connection.on('message', function (message) {
            console.log('Received response ' + message.utf8Data);
            if (sessions[id].clientConnection) {
                sessions[id].clientConnection.sendUTF(message.utf8Data)
            }
        });

        connection.on('close', function (reasonCode, description) {
            sessions[id] = null;
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });

        console.log((new Date()) + ' Device Connection accepted.');

    } else if (action === "/connect") {

        console.log((new Date()) + ' Client Connection accepted.');

        if (!sessions[id]) {
            initSession(id);
        }

        sessions[id].clientConnection = connection;

        connection.on('message', function (message) {
            console.log("Received request " + message);
            if (sessions[id].deviceConnection) {
                sessions[id].deviceConnection.sendUTF(message.utf8Data)
            } else {
                pendingRequests[id] = [message];
            }
        });

        connection.on('close', function (reasonCode, description) {
            if (sessions[id]) {
                sessions[id].clientConnection = null;
            }
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    }

});