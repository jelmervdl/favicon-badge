// ==UserScript==
// @name           Favicon badge
// @description    Shows badge in favicon when site has a title like "(8) ..."
// @include        *
// @author         Favicon badge by Jelmer van der Linde (http://ikhoefgeen.nl) 2010
// ==/UserScript==

(function() {
	
	var canvas, favicon, background, ctx, current_badge;
	
	var init = function()
	{
		canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;

		favicon = find_favicon();

		background = new Image();
		background.addEventListener('load',  function() { check_new_tweets() }, false);
		background.addEventListener('error', function() { background = null }, false);
		
		if(favicon.href) {
			if(is_same_domain(favicon.href))
				background.src = favicon.href
			else
				load_proxy(favicon.href, function(data) {
					background.src = data;
				});
		}
		else {
			background.src = '/favicon.ico';
		}

		ctx = canvas.getContext('2d');
		
		setInterval(check_new_tweets, 1000);
	}
	
	var find_favicon = function()
	{
		var link_elements = document.getElementsByTagName('link');
		for(var i = 0; i < link_elements.length; ++i) {
			if(link_elements[i].rel == 'shortcut icon')
				return link_elements[i];
		}
		
		var link_element = document.createElement('link');
		link_element.rel = 'shortcut-icon';
		link_element.type = 'image/x-icon';
		document.getElementsByTagName('head').item(0).appendChild(link_element);
		return link_element;
	}
	
	var draw_icon = function()
	{
		if(background && background.complete)
			ctx.drawImage(background, 0, 0, 16, 16);
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
	
	var draw_badge = function(i)
	{
		if(current_badge == i)
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
		
		ctx.fillText(i % 100, 10, 7, 7);
		
		current_badge = i;
		
		set_favicon();
	}
	
	var get_icon_uri = function()
	{
		try {
			return canvas.toDataURL('image/png');
		} catch(e) {
			console.log('shit', e);
		}
	}
	
	var set_favicon = function()
	{
		var next = favicon.cloneNode(false);
		next.href = get_icon_uri();
		favicon.parentNode.replaceChild(next, favicon);
		favicon = next;
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
	 */
	if(GM_xmlhttpRequest)
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
				headers: { "Referer": document.location.href },
				overrideMimeType: 'text/plain; charset=x-user-defined',  
				onload: function(response)
				{
					unsafeWindow.responseHeaders = response.responseHeaders;
				
					var mimetype = response.responseHeaders.match(/^Content-Type:\s*([^$]+?)\s*$/m) || ['', 'application/octet-stream'];
				
					callback('data:'+mimetype[1]+';base64,'+base64Encode(response.responseText));
				}
			});
		}
	else
		var load_proxy = function(uri, callback)
		{
			unsafeWindow.__load_proxy_callback = callback;

			var script_tag = document.createElement('script');
			script_tag.src = 'http://mirror.ikhoefgeen.nl/proxy.php?callback=__load_proxy_callback&uri=' + encodeURIComponent(uri);
			document.body.appendChild(script_tag);
		}

	init();
})();