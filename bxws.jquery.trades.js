jQuery( function ($) {
    $.fn.initTradeWidget = function( options ) {
        var table = $('tbody',this);

        var default_options = {
            maxRows: 30,
            rate_decimals: 2,
            volume_decimals: 8,
            highlightColor: "#d3e0fd",
            highlightFadeTime: 1000
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
            }

            var newtrades = false;

            message.trades.reverse();

            message.trades.forEach( function (trade) {
                if(addTradeToTable( trade )){
                    newtrades = true;
                }
            } );

            if(newtrades){
                $('.empty',table).remove();
                bx_lib.truncateTable(options.maxRows, table);
            }
            updateTimes() // update once immediately
        }

        function scheduleUpdateTimes() {
            setInterval( updateTimes, 1000 );
        }

        function updateTimes() {
            $( 'tr', table ).each( function () {
                var trade_time = $( this ).attr( 'data-date' );
                // convert dates to timestamp in milliseconds and calculate difference (it will be independent of timezone)
                var delta_ms   = (new Date()).getTime() - (new Date( trade_time )).getTime();
                // convert to seconds
                var delta_s    = Math.round( delta_ms / 1000 );
                $( 'td:eq(0) span', this ).text( bx_lib.ago( delta_s ) )
            } )
        }

        function addTradeToTable(trade) {
            var tr_id = parseInt(trade.trade_id);

            // prevent duplicates
            if ($( "[data-trade='"+tr_id+"']", table ).length > 0) {
                return false;
            }

            var icon = trade.trade_type === "buy"
                ? '<i class="fa fa-lg fa-arrow-circle-o-up green"></i>'
                : '<i class="fa fa-lg fa-arrow-circle-o-down red"></i>';


            var tr = '<tr data-trade="' + tr_id + '" data-date="' + bx_lib.safe_date(trade.trade_date) + '" style="background-color: ' + options.highlightColor + '">'
                + '<td>' + icon + '<span></span></td>'
                + '<td>' + bx_lib.safe_number(trade.rate, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number(trade.amount, options.volume_decimals) + '</td>'
                + '</tr>';

            table.prepend( tr );
            setTimeout(function(){
                $( "[data-trade='"+tr_id+"']", table ).css( { backgroundColor: "white" })
            },options.highlightFadeTime);
            return true;
        }
    };
} );
