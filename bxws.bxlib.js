var bx_lib = {
    wsConnection: function (options) {
        var reconnecting = false;
        var connection   = null;

        initConnection();

        function initConnection() {
            if (!window["WebSocket"]) {
                return alert( "Your browser does not support WebSockets." )
            }
            var url = getUrl();
            console.log( "Connecting to " + options.endpoint );
            connection = new WebSocket( url );
            attachEvents()
        }

        function getUrl() {
            var url = "wss://" + getHostname() + ":443/" +options. endpoint + "?pairing=" + options.pairing_id
            if (options.start_data) {
                url += "&start_data=" + options.start_data
            }
            return url
        }

        function getHostname() {
            return "ws.bx.in.th";
        }

        function attachEvents() {
            connection.onclose   = function (event) { onClose( event ) };
            connection.onerror   = function (event) { onError( event ) };
            connection.onmessage = function (event) {
                // pass event to all handlers
                options.handlers.forEach(function(handler){
                    handler(event)
                })
            };
            connection.onopen    = function (event) { onOpen( event ) }
        }

        function onOpen(event) {
            console.log( "Connection opened" )
        }

        function reConnect() {
            // _onClose event is fired multiple times on disconnected server
            // all this "reconnecting" mess is meant to prevent multiple reConnect attempts in a row
            if (reconnecting === true) return;

            reconnecting = true;
            initConnection();

            console.log( "Waiting a few seconds..." );
            setTimeout( checkConnectionState, 2000 )
        }

        function checkConnectionState() {
            reconnecting = false;
            console.log( "connection.readyState: ", connection.readyState );

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
                    console.log( "unknown state" );
            }

        }

        function onError(event) {
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

    resetTable: function(table) {
        $( 'tbody', table ).remove()
        table.append( "<tbody></tbody>" )
        return $( "tbody", table )
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
        if(x.substr(0,1) == '.'){
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

