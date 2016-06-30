var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();


var responses = {
    getTime : function(){
        return {time: new Date()};
    }
}

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');

    function sendResponse(response){
        connection.sendUTF(JSON.stringify(response));
    }

    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            var request = JSON.parse(message.utf8Data);
            var responseData = responses[request.action](request.data);
            sendResponse({action: request.action, id: request.id, data: responseData});
        }
    });

});

client.connect('ws://localhost:8080/create?id=123', 'remote-bridge-protocol');