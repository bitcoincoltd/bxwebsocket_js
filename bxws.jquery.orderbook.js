jQuery( function ($) {
    $.fn.initOrderBookWidget = function (options) {
        var table = this;
        var tbody = $("tbody", table);
        if (tbody.length === 0) {
            table.append("<tbody></tbody>");
            tbody = $("tbody", table)
        }

        var reinitTimeoutHandler = null;

        if (!options.type) {
            console.error( "You must specify type as 'sell' or 'buy'" )
        }

        var default_options = {
            maxRows: 30,
            minRows: 10,
            rate_decimals: 2,
            volume_decimals: 8,
            highlightColor: "#d3e0fd",
            highlightFadeTime: 1000
        };

        options = Object.assign( default_options, options );

        var pr = Math.pow(10,options.rate_decimals);

        return messageHandler;

        function messageHandler(event, connection) {
            console.debug( "[msg.raw.rcv]:", event.data );
            message = JSON.parse( event.data );
            console.debug( "processing:", message );

            if (!Array.isArray( message.orders )) {
                console.error( "Expected message containing orders array :( Got this stuff: ", message );
            }

            var initialize = (message.hasOwnProperty('initial') && message.initial);

            var orders = sortOrders(filterOrders(message.orders));

            if(initialize){
                tbody.empty();
            }

            orders.forEach( function (item) {
                processSingleRow( item, initialize);
            } );

            reinitIfTooManyRowsWhereDeleted(orders, connection);

            bx_lib.hideTable( options.maxRows, table,  options.maxRows * 10);
        }

        function reinitIfTooManyRowsWhereDeleted(orders, connection) {
            // this will prevent reinit if it was not enough rows from the start
            if (options.minRows > orders.length) {
                options.minRows = orders.length;
            }

            // we use timeout to allow multiple deletes in a row to go through
            // it happens when big trade clears out a lot of orders from order book
            clearTimeout(reinitTimeoutHandler);
            reinitTimeoutHandler = setTimeout(function() {
                if ($( "tr", tbody ).length < options.minRows) {
                    console.warn("Too many orders where deleted, re-init orders!");
                    connection.send("init_order_book");
                }
            }, 500);
        }

        function sortOrders(orders) {
            orders.sort(function(a, b) {
                if(a.action === 'delete'){ // Put deletes first
                    return -1;
                }
                var x = parseFloat(a.order.rate);
                var y = parseFloat(b.order.rate);
                if(x === y){
                    return parseInt(a.order.order_id) - parseInt(b.order.order_id);
                }
                if(options.type === 'buy') {
                    return y - x;
                }
                return x - y;
            });
            return orders;
        }

        function filterOrders(orders){
            return orders.filter( function (order) {
                return order.order.order_type === options.type
            } );
        }

        function processSingleRow(order, initialize) {
            var tr_id = parseInt( order.order.order_id );

            if (order.action === "delete") {
                deleteRow( tr_id );
            }

            if (order.action === "insert") {
                insertNewRow( order.order, tr_id, initialize);
            }
        }

        function insertNewRow(order, tr_id, initialize) {
            // prevent duplicates
            if ($( "[data-trade='" + tr_id + "']", tbody ).length > 0) {
                return;
            }

            var display_rate = order.rate;

            if(options.rate_decimals < 8){
                if(order.order_type === 'buy') {
                    display_rate = (Math.floor(parseFloat(display_rate) * pr) / pr).toString();
                }else{
                    display_rate = (Math.ceil(parseFloat(display_rate) * pr) / pr).toString();
                }
            }

            var tr = '<tr data-trade="' + tr_id + '"'
                + ' data-rate="' + order.rate + '"'
                + ' style="background-color: ' + options.highlightColor + '">'
                + '<td>' + bx_lib.safe_number( order.volume, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number( display_rate, options.rate_decimals) + '</td>'
                + '<td>' + bx_lib.safe_number( order.amount, options.volume_decimals) + '</td>'
                + '</tr>';

            if(initialize){
                tbody.append(tr);
            } else {
                insertRowSorted(tr, order);
            }

            setTimeout(function(){
                $( "[data-trade='" + tr_id +"']", tbody ).css( { backgroundColor: "white" })
            },options.highlightFadeTime);
        }

        function insertRowSorted(tr, order) {
            var inserted = false;
            var insertBefore = false;

            var c = 0;

            var row;
            $("tr", tbody).each(function(_, item){
                insertBefore = false;
                row = $(item);
                var rate = parseFloat(row.attr("data-rate"));
                var id = parseInt(row.attr("data-trade"));
                var order_rate = parseFloat( order.rate );
                var order_id = parseInt(order.order_id);

                if(order_rate === rate && order_id < id){
                    insertBefore = row;
                    inserted     = true;
                    return false;
                }

                if (order.order_type === "buy") {
                    if (order_rate > rate) {
                        insertBefore = row;
                        inserted     = true;
                        return false;
                    }
                } else {
                    if (order_rate < rate) {
                        insertBefore = row;
                        inserted     = true;
                        return false;
                    }
                }
                c++;
            });

            if (insertBefore) {
                $(tr).insertBefore(insertBefore);
                return;
            }

            if (!row) {
                tbody.prepend(tr);
                return;
            }

            if (!inserted) {
                tbody.append(tr);
            }
        }

        function deleteRow(tr_id) {
            $( "[data-trade='" + tr_id+"']", table ).remove();
        }
    };
} );
