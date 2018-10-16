var bx_lib = {
    wsConnection: function (options) {
        var reconnecting                     = false;
        var connection                       = null;
        var pingIntervalInSeconds            = 5;
        var waitPongForSeconds               = 3;
        var pingMessage                      = new ArrayBuffer( 1 );
        (new Uint8Array( pingMessage ))[0]   = 0x0;
        var waitingForPongHandler            = false;
        var statuses                         = {};
        var connectionMonitorIntervalHandler = null;
        statuses[WebSocket.CLOSED]           = "CLOSED";
        statuses[WebSocket.CLOSING]          = "CLOSING";
        statuses[WebSocket.CONNECTING]       = "CONNECTING";
        statuses[WebSocket.OPEN]             = "OPEN";

        initConnection();

        function initConnection() {
            if (!window["WebSocket"]) {
                return alert( "Your browser does not support WebSockets." );
            }

            var url = getUrl();
            console.log( "Connecting to " + options.endpoint );
            connection = new WebSocket( url );
            attachEvents();
            monitorConnectionAlive();
            // logConnectionState()
        }

        function monitorConnectionAlive() {
            clearInterval( connectionMonitorIntervalHandler );
            connectionMonitorIntervalHandler = setInterval( function () {
                if (connection.readyState === WebSocket.OPEN) {
                    pingPong();
                }
            }, pingIntervalInSeconds * 1000 )
        }

        function pingPong() {
            connection.send( pingMessage );
            waitingForPongHandler = setTimeout( function () {
                console.error( "Did not receive PONG! Forcing reconnection!" );
                reConnect();
            }, waitPongForSeconds * 1000 )
        }

        function logConnectionState() {
            clearInterval( this.monitorState );
            this.monitorState = setInterval( function () {
                console.log( (new Date).getTime() + " " + options.endpoint + ": state: ", statuses[connection.readyState] )
            }, 5000 )
        }

        function getUrl() {
            if (typeof websocket_url === 'undefined') {
                websocket_url = "wss://" + getHostname() + ":443/";
            }
            var url = websocket_url + options.endpoint + "?pairing=" + options.pairing_id;
            if (options.start_data) {
                url += "&start_data=" + options.start_data
            }
            return url;
        }

        function getHostname() {
            return "ws.bx.in.th";
        }

        function attachEvents() {
            connection.onclose   = function (event) { onClose( event ) };
            connection.onerror   = function (event) { onError( event ) };
            connection.onmessage = function (event) { onMessage(event) };
            connection.onopen    = function (event) { onOpen( event ) }
        }

        function onMessage(event) {
            // pong message
            if (event.data === "\u0000") {
                clearTimeout( waitingForPongHandler );
                return
            }

            // pass event to all handlers
            options.handlers.forEach( function (handler) {
                handler( event, connection )
            } )
        }

        function onOpen(event) {
            console.log( "Connection opened" )
        }

        function reConnect() {
            // _onClose event is fired multiple times on disconnected server
            // all this "reconnecting" mess is meant to prevent multiple reConnect attempts in a row
            if (reconnecting === true) return;

            reconnecting = true;
            if (connection.readyState === WebSocket.OPEN) {
                connection.close();
            }
            initConnection();

            console.log( "Waiting a few seconds..." );
            setTimeout( checkConnectionState, 2000 )
        }

        function checkConnectionState() {
            reconnecting = false;
            console.log( "Connection state: ", statuses[connection.readyState] );

            switch (connection.readyState) {
                case WebSocket.CLOSED || WebSocket.CLOSING:
                    console.error( "Connection closed. Will try to reconnect now..." );
                    reConnect();
                    break;
                case WebSocket.CONNECTING:
                    console.log( "Still trying to connect..." );
                    break;
                case WebSocket.OPEN:
                    console.log( "Connected!" );
                    break;
                default:
                    // should never happen
                    console.log( "Unknown state" );
            }

        }

        function onError(event) {
            // if connection was closed it will be onClose event as well.
            console.error( "Connection error: ", event );
        }

        function onClose(event) {
            console.error( "Connection closed. Will try to reconnect in a few seconds..." );
            reConnect();
        }
    },

    safe_number: function (str, decimals) {
        var x = parseFloat(str.replace( /[^0-9,.]/g, '' ));
        // allow only numbers, comma and a dot
        return this.numberWithCommas(x.toFixed(decimals));
    },

    safe_date: function (str) {
        return str.replace( /[^0-9\-T:+]/g, '' );
    },

    truncateTable: function (maxRows, table) {
        $( 'tr:gt(' + (maxRows - 1) + ')', table ).remove();
    },

    hideTable: function (maxRows, table, truncRows) {
        $( 'tr:gt(' + maxRows + ')', table ).hide();
        $( 'tr:lt(' + (maxRows + 1) + ')', table ).show();
        this.truncateTable( truncRows, table );
    },

    numberWithCommas: function (nStr){
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        x = x1 + x2;
        if(x.substr(0,1) === '.'){
            x = '0' + x;
        }
        return x;
    },

    ago: function (seconds) {
        if (seconds < 60) {
            if (seconds === 1) {
                return '1 Second Ago';
            }
            return seconds + ' Seconds Ago';

        } else if (seconds < 3600) {
            var minutes = Math.floor( seconds / 60 );
            if (minutes === 1) {
                return '1 Minute Ago';
            }
            return minutes + ' Minutes Ago';

        } else if (seconds < 86400) {
            var hours = Math.floor( seconds / 3600 );
            if (hours === 1) {
                return '1 Hour Ago';
            }
            return hours + ' Hours Ago';
        } else {
            var days = Math.floor( seconds / 86400 );
            if (days === 1) {
                return '1 Day Ago';
            }
            return days + ' Days Ago';
        }
    }
};

