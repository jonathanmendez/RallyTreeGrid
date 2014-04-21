(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     * Parses an ALM compatible query string
     */

    Ext.define('Rally.data.util.QueryStringParser', {

        config: {
            /**
             * @cfg {String} (required)
             * The string to parse into a {Rally.data.QueryFilter}
             */
            string: null
        },

        constructor: function (config) {
            this.initConfig(config);
        },

        /**
         * @private
         * {RegEx} The operation regex
         */
        operations: /^\s*(=|!=|<=|>=|<|>|AND|OR|[!]?CONTAINS|\(|\))/i,

        /**
         * @private
         * {RegEx} The quote regex
         */
        quotes: /^\s*"([^"|\\"]+)"/,

        /**
         * @private
         * {RegEx} The word regex
         */
        words: /^\s*([^ \)]+)/,

        /**
         * @private
         * {Array[String]} Array of valid operations to parse from a string expression
         */
        operators: ['=','!=','<=','>=','<','>','AND','OR','!CONTAINS','CONTAINS'],

        /**
         * Find the next token
         * @private
         * @return {String}
         */
        peek: function () {
            var string = Ext.String.trim(this.string),
                matches;

            matches = this.operations.exec(string);
            if (matches && matches.length) {
                return matches[1];
            }

            matches = this.quotes.exec(string);
            if (matches && matches.length) {
                return matches[1];
            }

            matches = this.words.exec(string);
            if (matches && matches.length) {
                return matches[1];
            }
            return '';
        },

        /**
         * Remove the stringToFind from the string to move onto the next token
         * @private
         * @param {String} stringToFind
         * @return {String}
         */
        consume: function (stringToFind) {
            string = Ext.String.trim(this.string);
            this.string = string.substring(string.indexOf(stringToFind) + stringToFind.length);
        },

        /**
         * Parse the next term in the string
         * @private
         * @return {String|Rally.data.QueryFilter}
         */
        parseNextTerm: function () {
            var nextTerm = this.peek();
            if (nextTerm === '(') {
                this.consume('(');
                var expression = this.applyOperators(this.operators);
                if (!(expression instanceof Rally.data.QueryFilter)) {
                    throw new Error('Invalid expression starting at "' + expression + '"');
                }
                this.consume(')');
                return expression;
            } else {
                this.consume(nextTerm);
                return nextTerm;
            }
        },

        applyOperators: function (operators, operator) {
            if (!operators.length) {
                return this.parseNextTerm();
            }

            if (!operator) {
                operator = operators[0];
            }

            var property = this.applyOperators(operators.slice(1));

            while (this.peek() === operator) {
                this.consume(operator);
                var value = this.applyOperators(operators.slice(1));
                property = Ext.create('Rally.data.QueryFilter', {
                    property: property,
                    operator: operator,
                    value: this._convertToType(value)
                });
            }
            return property;
        },

        /**
         * Make sure we are aware of types
         * @param value
         * @private
         */
        _convertToType: function (value) {
            if (!Ext.isString(value)) {
                return value;
            }
            if (value.toLowerCase() === 'true') {
                return true;
            } else if (value.toLowerCase() === 'false') {
                return false;
            } else if ((value.length > 0) && !isNaN(+value)) {
                return +value;
            } else {
                return value;
            }
        },

        /**
         * Convert the operations in the provided string to uppercase
         * @private
         * @return {String}
         */
        _operatorsToUpperCase: function (string) {
            string = string.replace(/\)\s+and\s+\(/ig, ') AND (');
            string = string.replace(/\)\s+or\s+\(/ig, ') OR (');
            return string.replace(/\b(contains)/ig, 'CONTAINS');
        },

        /**
         * Parse the expression provided if possible
         * @return {Rally.data.QueryFilter}
         */
        parseExpression: function () {
            var originalString = this.string;

            if (this.string === null) {
                throw new Error ('Cannot parse null query: ' + originalString);
            }

            this.string = Ext.String.trim(this.string);
            this.string = this._operatorsToUpperCase(this.string);

            var filter = this.parseNextTerm();

            if (!(filter instanceof Rally.data.QueryFilter)) {
                throw new Error ('Failed to parse query: ' + originalString);
            }

            var trailingQuery = this.parseNextTerm();
            if(trailingQuery) {
                throw new Error ('Failed to parse query: found trailing info at "' + trailingQuery + '". Make sure you wrap the whole query in parentheses.');
            }

            return filter;
        }

    });
})();
