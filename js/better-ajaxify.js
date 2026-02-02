/**
 * better-ajaxify: A simple PJAX engine for websites
 * @version 3.0.0-beta.5 Wed, 18 Nov 2020 13:38:12 GMT
 * @link https://github.com/chemerisuk/better-ajaxify
 * @copyright 2020 Maksim Chemerisuk
 * @license MIT
 */
(function () {
  "use strict";

  (function (window) {
    var document = window.document;
    var location = window.location;
    var history = window.history;
    var fetch = window.fetch;
    var Request = window.Request;
    var URLSearchParams = window.URLSearchParams; // do not enable the plugin for old browsers

    if (!fetch || !Request || !URLSearchParams) return;
    var parser = new DOMParser();
    var domStates = []; // in-memory storage for states
    var lastDomState = {};
	
    function attachNonPreventedListener(target, eventType, callback) {
      target.addEventListener(eventType, function (e) {
        if (!e.defaultPrevented) {
          callback(e);
        }
      }, false);
    }

    function dispatchAjaxifyEvent(el, type, detail) {
      var e = document.createEvent("CustomEvent");
      e.initCustomEvent("ajaxify:" + type, true, true, detail || null);
      return el.dispatchEvent(e);
    }

    attachNonPreventedListener(document, "click", function (e) {
      var body = document.body;

      for (var el = e.target; el && el !== body; el = el.parentNode) {
        if (el.nodeName.toLowerCase() === "a") {
          var targetUrl = el.href;
		  if (el.classList.contains('no-ajaxy')) {
			break;
		  }
          if (!el.target && targetUrl && targetUrl.startsWith("http")) {
            var currentUrl = location.href;
			var t_split = targetUrl.split("#",2);
			var c_split = currentUrl.split("#",2);
            var targetUrlLead = t_split[0];
            var currentUrlLead = c_split[0];
            if (targetUrlLead !== currentUrlLead) {
              dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl)); // prevent default behavior for links

              e.preventDefault();
            } else if (targetUrlLead == currentUrlLead) {
			  if (t_split.length > 1) { //has an anchor
				if (t_split[0] == c_split[0]) { //we're on this url/anchor
					e.preventDefault();
				}
			  } else { //we're on this base url
				e.preventDefault();
			  }
            }
          }

          break;
        }
      }
    });
    attachNonPreventedListener(document, "submit", function (e) {
      var el = e.target;
      var targetUrl = el.action;

      if (!el.target || !targetUrl || targetUrl.startsWith("http")) {
        var formData = new FormData(el);

        if (dispatchAjaxifyEvent(el, "serialize", formData)) {
          var formMethod = el.method.toUpperCase() || "GET";
          var formEnctype = el.getAttribute("enctype") || el.enctype;
          var requestOptions = {
            method: formMethod,
            headers: {
              "Content-Type": formEnctype
            }
          };

          if (formEnctype === "multipart/form-data") {
            requestOptions.body = formData;
          } else {
            var searchParams = new URLSearchParams(formData);

            if (requestOptions.method === "GET") {
              targetUrl += (~targetUrl.indexOf("?") ? "&" : "?") + searchParams;
            } else if (formEnctype !== "application/json") {
              requestOptions.body = searchParams.toString();
            } else {
              var jsonData = {};
              searchParams.forEach(function (value, key) {
                if (Array.isArray(jsonData[key])) {
                  jsonData[key].push(value);
                } else if (key in jsonData) {
                  jsonData[key] = [jsonData[key], value];
                } else {
                  jsonData[key] = value;
                }
              });
              requestOptions.body = JSON.stringify(jsonData);
            }
          }

          dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl, requestOptions)); // prevent default behavior for forms

          e.preventDefault();
        }
      }
    });
    attachNonPreventedListener(document, "ajaxify:fetch", function (e) {
      var domElement = e.target;
      var req = e.detail;
      fetch(req).then(function (res) {
        dispatchAjaxifyEvent(domElement, "load", res);
      }).catch(function (err) {
        if (dispatchAjaxifyEvent(domElement, "error", err)) {
          throw err;
        }
      });
    });
    attachNonPreventedListener(document, "ajaxify:load", function (e) {
      var domElement = e.target;
      var res = e.detail;
      res.text().then(function (html) {
        var doc = parser.parseFromString(html, "text/html");

        if (dispatchAjaxifyEvent(domElement, "render", doc)) {
          if (res.url !== location.href.split("#")[0]) {
            // update URL in address bar
            history.pushState(domStates.length, doc.title, res.url);
			domStates.push(doc);
          } else {
            history.replaceState(domStates.length - 1, doc.title, res.url);
			domStates[domStates.length-1] = doc; //change last in history (current)
          }
        }
      }).catch(function (err) {
        if (dispatchAjaxifyEvent(domElement, "error", err)) {
          throw err;
        }
      });
    });
    attachNonPreventedListener(document, "ajaxify:render", function (e) {
      var newDomState = e.detail;
      lastDomState.body = document.body;
      lastDomState.title = document.title;

	  var l_target = document.body.querySelector('#wrap > div.outer');
	  var r_target = newDomState.body.querySelector('#wrap > div.outer');
	  var l_parent = l_target.parentElement;
	  var r_parent = r_target.parentElement;
	  l_parent.replaceChild(r_target, l_target);
	  // update page title
	  //document.documentElement.replaceChild(newDomState.body, document.body);
      document.title = newDomState.title;
    });
    attachNonPreventedListener(window, "popstate", function (e) {
      var stateIndex = e.state; // numeric value indicates better-ajaxify state

      if (typeof stateIndex === "number") {
		  //should use domStates if possible (ignoring for now)
		dispatchAjaxifyEvent(document, "fetch", new Request(location.href));
      } // FIXME: trigger navigation request when /a -> /b#hash

    }); // update initial state address url

    history.replaceState(0, document.title);
  })(window);
})();