(function (window, undefined) {
    var History = window.History,
        $ = window.jQuery,
        document = window.document;
    if (!History.enabled) {
        return false
    }
    $(function () {
        var contentSelector = 'div.outer > section#main',
            $content = $(contentSelector),
            contentNode = $content.get(0),
            $menu = $('#menu,#nav,nav:first,.nav:first').filter(':first'),
            activeClass = 'active selected current youarehere',
            activeSelector = '.active,.selected,.current,.youarehere',
            menuChildrenSelector = '> li,> ul > li',
            completedEventName = 'statechangecomplete',
            $window = $(window),
            $body = $(document.body),
            rootUrl = History.getRootUrl(),
            scrollOptions = {
                duration: 800,
                easing: 'swing'
            };
        if ($content.length === 0) {
            $content = $body
        }
        $.expr[':'].internal = function (obj, index, meta, stack) {
            var $this = $(obj),
                url = $this.attr('href') || '',
                isInternalLink;
            isInternalLink = url.substring(0, rootUrl.length) === rootUrl || url.indexOf(':') === -1;
            return isInternalLink
        };
        var documentHtml = function (html) {
            var result = String(html)
                .replace(/<\!DOCTYPE[^>]*>/i, '')
                .replace(/<(html|head|body|title|meta|script)([\s\>])/gi, '<div class="document-$1"$2')
                .replace(/<\/(html|head|body|title|meta|script)\>/gi, '</div>');
            return $.trim(result)
        };
        $.fn.ajaxify = function () {
            var $this = $(this);
            $this
                .find('a:internal:not(.no-ajaxy)')
                .click(function (event) {
                    var $this = $(this),
                        url = $this.attr('href'),
                        title = $this.attr('title') || null;
                    if (event.which == 2 || event.metaKey) {
                        return true
                    }
                    History.pushState(null, title, url);
                    event.preventDefault();
                    return false
                });
            return $this
        };
        $body.ajaxify();
        $window.bind('statechange', function () {
            var State = History.getState(),
                url = State.url,
                relativeUrl = url.replace(rootUrl, '');
            $body.addClass('loading');
            $content.animate({
                opacity: 0
            }, 800);
            $.ajax({
                url: url,
                success: function (data, textStatus, jqXHR) {
                    var $data = $(documentHtml(data)),
                        $dataBody = $data.find('.document-body:first'),
                        $dataContent = $dataBody
                            .find(contentSelector)
                            .filter(':first'),
                        $menuChildren,
                        contentHtml,
                        $scripts;
                    $scripts = $dataContent.find('.document-script');
                    if ($scripts.length) {
                        $scripts.detach()
                    }
                    contentHtml = $dataContent.html() || $data.html();
                    if (!contentHtml) {
                        document.location.href = url;
                        return false
                    }
                    $menuChildren = $menu.find(menuChildrenSelector);
                    $menuChildren
                        .filter(activeSelector)
                        .removeClass(activeClass);
                    $menuChildren = $menuChildren.has('a[href^="' + relativeUrl + '"],a[href^="/' + relativeUrl + '"],a[href^="' + url + '"]');
                    if ($menuChildren.length === 1) {
                        $menuChildren.addClass(activeClass)
                    }
                    $content.stop(true, true);
                    $content
                        .html(contentHtml)
                        .ajaxify()
                        .css('opacity', 100)
                        .show();
                    document.title = $data
                        .find('.document-title:first')
                        .text();
                    try {
                        document.getElementsByTagName('title')[0].innerHTML = document
                            .title
                            .replace('<', '&lt;')
                            .replace('>', '&gt;')
                            .replace(' & ', ' &amp; ')
                    } catch (Exception) {}
                    $scripts
                        .each(function () {
                            var $script = $(this),
                                scriptText = $script.text(),
                                scriptNode = document.createElement('script');
                            if ($script.attr('src')) {
                                if (!$script[0].async) {
                                    scriptNode.async = false
                                }
                                scriptNode.src = $script.attr('src')
                            }
                            scriptNode.appendChild(document.createTextNode(scriptText));
                            contentNode.appendChild(scriptNode)
                        });
                    if ($body.ScrollTo || false) {
                        $body.ScrollTo(scrollOptions)
                    }
                    $body.removeClass('loading');
                    $window.trigger(completedEventName);
                    if (typeof window._gaq !== 'undefined') {
                        window
                            ._gaq
                            .push(['_trackPageview', relativeUrl])
                    }
                    if (typeof window.reinvigorate !== 'undefined' && typeof window.reinvigorate.ajax_track !== 'undefined') {
                        reinvigorate.ajax_track(url);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    document.location.href = url;
                    return false
                }
            });
        });
    });
})(window);