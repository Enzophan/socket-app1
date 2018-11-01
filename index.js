var mongo = require('mongodb').MongoClient;
// var io = require('socket.io').listen(3000).sockets;

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

users = [];
connections = [];

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

mongo.connect('mongodb://admin:Hiennhan47@ds237989.mlab.com:37989/nodenhan', function (err, db) {
    if (err) {
        throw err;
    }
    console.log('MongoDb Connected...');
    //connect to socket
    io.on('connection', function (socket) {

        connections.push(socket);
        console.log('Connected: %s sockets connected', connections.length);

        socket.on('disconnect', function (data) {
            users.splice(users.indexOf(socket.username), 1);
            updateUserNames();
            connections.splice(connections.indexOf(socket), 1);
            console.log('Disconnected:  %s socket connected', connections.length);
        });

        var chat = db.collection('chats');
        var nickname = db.collection('nicknames');

        socket.on('new user', function (data) {
            var name = data.name;
            var email = data.email;

            if (name == '' || email == '') {
                sendStatus('Please enter a name');
            } else {
                nickname.findOne({ name: name }, function (err, res) {
                    if (err) {
                        throw err;
                    };
                    // console.log("Find One: " + JSON.stringify(res));
                    if (res) {
                        // console.log("Find Name: " + JSON.stringify(res.name));
                        socket.username = res.name;
                        users.push(socket.username);
                        updateUserNames();
                        sendStatus('Old user');
                    } else {
                        nickname.insert({ name: name, email: email }, function () {
                            // socket.emit('get users', [data]);
                            socket.username = data.name;
                            users.push(socket.username);
                            updateUserNames();
                            sendStatus('Created user');
                        });
                    };
                });
            };
        });

        function updateUserNames() {
            io.sockets.emit('get users', users);
        }

        //Get chat history from mongo 
        chat.find().limit(100).sort({ _id: 1 }).toArray(function (err, res) {
            if (err) {
                throw err;
            }
            // emit message
            socket.emit('output', res);
        });

        sendStatus = function (s) {
            socket.emit('status', s);
        };


        socket.on('input', function (data) {
            let name = data.name;
            let message = data.message;

            if (name == '' || message == '') {
                sendStatus('Please enter a name and message');

            } else {
                chat.insert({ name: name, message: message }, function () {
                    io.sockets.emit('output', [data]);
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                });
            };

        });
        // Remove Message
        socket.on('clear', function (data) {
            chat.remove({}, function () {
                socket.emit('cleared');
                sendStatus({
                    message: 'Cleared all message',
                    clear: true
                });
            })
        });

    });

});

http.listen(process.env.PORT || 3000, function () {
    console.log('listening on *:3000');
});
