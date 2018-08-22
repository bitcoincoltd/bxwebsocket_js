jQuery( function ($) {
    $.fn.initOrderBookWidget = function (options) {
        var table = this;
        var initialized = false;
        var tbody = $("tbody", table);
        if (tbody.length === 0) {
            table.append("<tbody></tbody>");
            tbody = $("tbody", table)
        }

        if (!options.type) {
            console.error( "You must specify type as 'sell' or 'buy'" )
        }

        var default_options = {
            maxRows: 30,
            highlightColor: "#b2ebfd",
            highlightFadeTime: 4000,
            rate_decimals: 2,
            volume_decimals: 8
        };

        options = Object.assign( default_options, options );

        return messageHandler;

        function messageHandler(event) {
            console.debug( "[msg.raw.rcv]:", event.data );
            message = JSON.parse( event.data );
            console.debug( "processing:", message );

            if (!Array.isArray( message.orders )) {
                console.error( "Expected message containing orders array :( Got this staff: ", message );
                return;
            }

            if (message.initial === true) {
                tbody = bx_lib.resetTable(table)
            }

            if(!initialized){
                message.orders = message.orders.sort(function(a, b) {
                    var x = parseFloat(a.order.rate);
                    var y = parseFloat(b.order.rate);
                    if(options.type === 'buy') {
                        return y - x;
                    }
                    return x - y;
                });
            }

            message.orders.forEach( function (item) {
                processSingleRow( item , initialized)
            } );

            initialized = true;

            bx_lib.truncateTable( options.maxRows, table )
        }

        function processSingleRow(order, sort) {
            // ignore other type
            if (order.order.order_type !== options.type) {
                return;
            }

            var tr_id = "order_" + parseInt( order.order.order_id );

            // console.log( "Recv action: " + order.action + " for row: " + tr_id + " type: " + order.order.order_type);

            if (order.action === "delete") {
                deleteRow( tr_id );
            }

            if (order.action === "insert") {
                insertNewRow( order.order, tr_id, sort);
            }
        }

        function insertNewRow(order, tr_id, sort) {
            // prevent duplicates
            if (sort && $( '#' + tr_id, table ).length > 0) {
                return;
            }

            var tr = '<tr id="' + tr_id + '" '
                + ' data-rate="' + order.rate + '"'
                + (sort ? 'style="background-color: ' + options.highlightColor + '"' : '') + '>'
                + '<td>' + bx_lib.safe_number( order.volume, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number( order.rate, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number( order.amount, options.volume_decimals) + '</td>'
                + '</tr>';

            // table.prepend(tr)
            if(!sort){
                tbody.append(tr);
                return;
            }
            insertRowSorted(tr, order, tr_id);

            setTimeout(function(){
                $( "#" + tr_id, table ).css( { backgroundColor: "white" })
            },options.highlightFadeTime);
        }

        function insertRowSorted(tr, order, tr_id) {
            var inserted = false;
            var insertBefore = false;
            // console.log("inserting row with rate", order.rate);

            var row;
            $("tr", tbody).each(function(_, item){
                insertBefore = false;
                row = $(item);

                if (order.order_type === "buy") {
                    if (parseFloat( order.rate ) >= parseFloat( row.attr( "data-rate" ) )) {
                        insertBefore = row;
                        inserted     = true;
                        return false // stop searching.
                    }
                } else {
                    if (parseFloat( order.rate ) <= parseFloat( row.attr( "data-rate" ) )) {
                        insertBefore = row;
                        inserted     = true;
                        return false // stop searching.
                    }
                }
            });

            if (insertBefore) {
                // console.log("inserted before", insertBefore.attr("data-rate"));
                $(tr).insertBefore(insertBefore);
                return;
            }

            if (!row) {
                // console.log("first row in a table");
                tbody.prepend(tr);
                return;
            }

            if (!inserted) {
                // console.log("inserted as last row");
                tbody.append(tr);
            }
        }

        function deleteRow(tr_id) {
            $( '#' + tr_id, table ).remove();
        }
    };
} );
