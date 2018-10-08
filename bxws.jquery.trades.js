jQuery( function ($) {
    $.fn.initTradeWidget = function( options ) {
        var table = this;
        var tbody = $("tbody", table)
        if (tbody.length === 0) {
            table.append("<tbody></tbody>")
            tbody = $("tbody", table)
        }

        var default_options = {
            maxRows: 20,
            highlightColor: "#b2ebfd",
            highlightFadeTime: 1000,
            rate_decimals: 2,
            volume_decimals: 8
        };

        options = Object.assign(default_options, options);

        scheduleUpdateTimes();

        return messageHandler;

        function messageHandler(event) {
            console.debug( "[msg.raw.rcv]:", event.data );
            message = JSON.parse( event.data );
            console.debug( "processing:", message );

            if (!Array.isArray( message.trades )) {
                console.error( "Expected message containing trades array :( Got this stuff: ", message );
                return;
            }

            if (message.initial === true) {
                tbody = bx_lib.resetTable(table)
            }

            message.trades.reverse();

            message.trades.forEach( function (trade) {
                addTradeToTable( trade )
            } );

            bx_lib.truncateTable(options.maxRows, table);
            updateTimes() // update once immediately
        }

        function scheduleUpdateTimes() {
            setInterval( updateTimes, 1000 );
        }

        function updateTimes() {
            $( 'tr', tbody ).each( function () {
                var trade_time = $( this ).attr( 'data-date' );
                // convert dates to timestamp in milliseconds and calculate difference (it will be independent of timezone)
                var delta_ms   = (new Date()).getTime() - (new Date( trade_time )).getTime();
                // convert to seconds
                var delta_s    = Math.round( delta_ms / 1000 );
                $( '.trade_time', this ).text( bx_lib.ago( delta_s ) )
            } )
        }

        function addTradeToTable(trade) {
            var tr_id = "trade_" + parseInt(trade.trade_id);

            // prevent duplicates
            if ($( '#' + tr_id, tbody ).length > 0) {
                return;
            }

            var icon = trade.trade_type === "buy"
                ? '<i class="fa fa-lg fa-arrow-circle-o-up green"></i>'
                : '<i class="fa fa-lg fa-arrow-circle-o-down red"></i>';


            var tr = '<tr id="' + tr_id + '" data-date="' + bx_lib.safe_date(trade.trade_date) + '" style="background-color: ' + options.highlightColor + '">'
                + '<td>' + icon + '<span class="trade_time"></span></td>'
                + '<td>' + bx_lib.safe_number(trade.rate, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number(trade.amount, options.volume_decimals) + '</td>'
                + '</tr>';

            tbody.prepend( tr );

            setTimeout(function(){
                $( "#" + tr_id, tbody ).css( { backgroundColor: "white" })
            },options.highlightFadeTime);
        }
    };
} );
