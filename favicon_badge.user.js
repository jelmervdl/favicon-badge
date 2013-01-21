// ==UserScript==
// @name           Favicon badge
// @namespace      nl.ikhoefgeen
// @description    Shows badge in favicon when site has a title like "(8) ..."
// @include        *
// @author         Favicon badge by Jelmer van der Linde (http://ikhoefgeen.nl) 2010
// @version        1.4
// ==/UserScript==

/**
 * Copyright (c) 2013 Jelmer van der Linde
 * See the file LICENSE for copying permission.
 *
 * Changelog:
 * v1.4 - 2010-06-18
 * - Cross-domain XMLHttpRequest instead of jsonp when possible
 * 
 * v1.3 - 2010-05-27
 * - fixed JSONp proxy in Chrome
 * - Removed the hidden iframe hack for Chrome, since that bug is solved
 *
 * v1.2 - 2010-03-02
 * - Using hidden iframe to reload favicon in Chrome
 * - Calling fillText multiple times to make the font readable in Chrome
 * - Load timeout to try to load the icon when GM_xmlhttpRequest fails
 *
 * v1.1 - 2010-01-11
 * - modified unsafeWindow.document instead of document for Google Chrome error
 *
 * v1.0 - 2010-01-11
 * - initial release
 *
 */

(function() {
	
	var draw_passes = 3;
	
	var canvas, favicon, background, ctx, current_badge;
	
	if(typeof unsafeWindow == 'undefined')
		var unsafeWindow = window;
	
	var init = function()
	{
		canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;

		favicon = find_favicon_node();

		background = new Image();
		background.addEventListener('load',  function() { check_new_tweets() }, false);
		background.addEventListener('error', function() { background = null }, false);
		
		var load_timeout;
		
		if(favicon.href) {
			if(is_same_domain(favicon.href)) {
				background.src = favicon.href;
				console.log('load same domain');
			} else {
				load_proxy(favicon.href, function(data) {
					background.src = data;
					console.log('loaded from proxy');
					clearTimeout(load_timeout);
				});
				load_timeout = setTimeout(function() {
					background.src = '/favicon.ico';
					console.log('proxy fallback');
				}, 5000);
				console.log('wait for proxy');
			}
		}
		else {
			background.src = '/favicon.ico';
			console.log('fallback');
		}

		ctx = canvas.getContext('2d');

		setInterval(check_new_tweets, 1000);
	}
	
	var find_favicon_node = function()
	{
		var link_elements = unsafeWindow.document.getElementsByTagName('link');
		for(var i = 0; i < link_elements.length; ++i) {
			if(link_elements[i].rel == 'shortcut icon')
				return link_elements[i];
		}
		
		var link_element = create_favicon_node();
		unsafeWindow.document.getElementsByTagName('head').item(0).appendChild(link_element);
		
		return link_element;
	}
	
	var create_favicon_node = function()
	{
		var link_element = document.createElement('link');
		link_element.rel = 'shortcut icon';
		
		return link_element;
	}
	
	var draw_icon = function()
	{
		if(background && background.src && background.complete)
			ctx.drawImage(background, 0, 0, background.width, background.height,
									  0, 0, 16, 16);
	}
	
	var wipe_badge = function()
	{
		ctx.clearRect(0, 0, 16, 16);
	}
	
	var clear_badge = function()
	{
		if(current_badge == null)
			return;
		
		wipe_badge();
		
		draw_icon();
		
		current_badge = null;
		
		set_favicon();
	}
	
	var draw_badge = function(n)
	{
		if(current_badge == n)
			return;
		
		wipe_badge();
		
		draw_icon();
		
		ctx.fillStyle = 'red';
		
		ctx.beginPath();
		ctx.arc(10, 5, 5, 0, Math.PI * 2, false);
		ctx.fill();
		
		ctx.fillStyle = 'white';
		ctx.font = '5pt Arial';
		ctx.textAlign = 'center';
		
		for(var i = 0; i < draw_passes; ++i)
			ctx.fillText(n % 100, 10, 7, 7);

		current_badge = n;
		
		set_favicon();
	}
	
	var get_icon_uri = function()
	{
		return canvas.toDataURL('image/png');
	}
	
	var i = 0;
	
	var set_favicon = function()
	{
		try {
			favicon.href = get_icon_uri();
		}
		catch(e) {}
	}
	
	var is_same_domain = function(url)
	{
		var parts = url.match(new RegExp('^(?:(\\w+:)//([\\w\\.]+))?(/?.+)$'));
		
		if(parts[1] && parts[1] != document.location.protocol)
			return false;
		
		if(parts[2] && parts[2] != document.location.hostname)
			return false;
		
		return true;
	}
	
	var check_new_tweets = function()
	{
		var tweet_count = document.title.match(/\((\d+)\)/);
		
		if(tweet_count)
			draw_badge(tweet_count[1]);
		else
			clear_badge();
	}
	
	/* Methods to load the favicon from outside the domain, since some sites use
	 * a content delivery network and don't have the favicon at /favicon.ico
	 * like Twitter, which hosts a ugly version of it's icon at /favicon.ico.
	 *
	 * Uses GM_xmlhttpRequest + base64Encode to download the file and convert it
	 * to a data-uri. If not available, it will use a webservice that does this
	 * for you.
	 *
	 * Unfortunately Google Chrome's GM_xmlhttpRequest is bound by the same-origin
	 * policy. So we fallback to the script-tag injection method.
	 */
	if(typeof GM_xmlhttpRequest != "undefined" &&
		navigator.userAgent.toLowerCase().indexOf('chrome') == -1) {
		var load_proxy = function(uri, callback)
		{
			/**
			*  Base64 encode / decode
			*  http://www.webtoolkit.info/
			**/
			var base64Encode = function (input)
			{
				var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
				var output = "";
				var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
				var i = 0;

				while (i < input.length) {

					chr1 = input.charCodeAt(i++) & 0xFF;
					chr2 = input.charCodeAt(i++) & 0xFF;
					chr3 = input.charCodeAt(i++) & 0xFF;

					enc1 = chr1 >> 2;
					enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					enc4 = chr3 & 63;

					if (isNaN(chr2)) {
						enc3 = enc4 = 64;
					} else if (isNaN(chr3)) {
						enc4 = 64;
					}

					output = output +
					_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
					_keyStr.charAt(enc3) + _keyStr.charAt(enc4);

				}

				return output;
			}
		
			GM_xmlhttpRequest({
				url: uri,
				method: 'GET',
				overrideMimeType: 'text/plain; charset=x-user-defined',  
				onload: function(response)
				{
					var mimetype = response.responseHeaders.match(/^Content-Type:\s*([^$]+?)\s*$/m) || ['', 'application/octet-stream'];
					callback('data:'+mimetype[1]+';base64,'+base64Encode(response.responseText));
				}
			});
		}
	} else {
		var load_proxy = function(uri, callback)
		{
			var request = new XMLHttpRequest();
			request.open('GET', 'http://mirror.ikhoefgeen.nl/proxy.php?uri=' + encodeURIComponent(uri), true);
			request.onload = function() {
				if(request.status == 200) {
					callback(request.responseText);
				}
			}
			request.send(null);
		}
	}

	init();
})();