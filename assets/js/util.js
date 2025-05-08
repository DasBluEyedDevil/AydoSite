(function($) {

    // Assumes a modern browser environment (Edge, Chrome, Firefox, Safari).

    /**
     * Generate an indented list of links from a nav for use with panel().
     * @return {jQuery} jQuery object.
     */
    $.fn.navList = function() {
        var $this = $(this);
        var $a = $this.find('a');
        var b = [];

        $a.each(function() {
            var $this = $(this);
            var indent = Math.max(0, $this.parents('li').length - 1);
            var href = $this.attr('href');
            var target = $this.attr('target');

            b.push(
                '<a ' +
                'class="link depth-' + indent + '"' +
                (target ? ' target="' + target + '"' : '') +
                (href ? ' href="' + href + '"' : '') +
                '>' +
                '<span class="indent-' + indent + '"></span>' +
                $this.text() +
                '</a>'
            );
        });

        return b.join('');
    };

    /**
     * Panel-ify an element.
     * @param {object} userConfig User configuration.
     * @return {jQuery} jQuery object.
     */
    $.fn.panel = function(userConfig) {
        if (this.length === 0) return $this;
        if (this.length > 1) {
            this.each(function() {
                $(this).panel(userConfig);
            });
            return $this;
        }

        var $this = $(this);
        var $body = $('body');
        var $window = $(window);
        var id = $this.attr('id');
        var config = $.extend({
            delay: 0,
            hideOnClick: false,
            hideOnEscape: false,
            hideOnSwipe: false,
            resetScroll: false,
            resetForms: false,
            side: null,
            target: $this,
            visibleClass: 'visible'
        }, userConfig);

        if (typeof config.target !== 'jQuery') config.target = $(config.target);

        $this._hide = function(event) {
            if (!config.target.hasClass(config.visibleClass)) return;
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            config.target.removeClass(config.visibleClass);

            setTimeout(function() {
                if (config.resetScroll) $this.scrollTop(0);
                if (config.resetForms) {
                    $this.find('form').each(function() {
                        this.reset();
                    });
                }
            }, config.delay);
        };

        if (config.hideOnClick) {
            $this.find('a').css('-webkit-tap-highlight-color', 'rgba(0,0,0,0)');
            $this.on('click', 'a', function(event) {
                var $a = $(this);
                var href = $a.attr('href');
                var target = $a.attr('target');

                if (!href || href === '#' || href === '' || href === '#' + id) return;

                event.preventDefault();
                event.stopPropagation();
                $this._hide();

                setTimeout(function() {
                    if (target === '_blank') window.open(href);
                    else window.location.href = href;
                }, config.delay + 10);
            });
        }

        $this.on('click', 'a[href="#' + id + '"]', function(event) {
            event.preventDefault();
            event.stopPropagation();
            config.target.removeClass(config.visibleClass);
        });

        $body.on('click touchend', function(event) {
            $this._hide(event);
        });

        $body.on('click', 'a[href="#' + id + '"]', function(event) {
            event.preventDefault();
            event.stopPropagation();
            config.target.toggleClass(config.visibleClass);
        });

        if (config.hideOnEscape) {
            $window.on('keydown', function(event) {
                if (event.keyCode === 27) $this._hide(event);
            });
        }

        return $this;
    };

    /**
     * Moves elements to/from the first positions of their respective parents.
     * @param {jQuery} $elements Elements (or selector) to move.
     * @param {boolean} condition If true, moves elements to the top. Otherwise, moves elements back to their original locations.
     */
    $.prioritize = function($elements, condition) {
        var key = '__prioritize';

        if (typeof $elements !== 'jQuery') $elements = $($elements);

        $elements.each(function() {
            var $e = $(this);
            var $parent = $e.parent();

            if ($parent.length === 0) return;

            if (!$e.data(key)) {
                if (!condition) return;

                var $p = $e.prev();
                if ($p.length === 0) return;

                $e.prependTo($parent);
                $e.data(key, $p);
            } else {
                if (condition) return;

                var $p = $e.data(key);
                $e.insertAfter($p);
                $e.removeData(key);
            }
        });
    };

})(jQuery);