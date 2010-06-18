<?php

function data_uri($data, $mime) 
{  
	$base64   = base64_encode($data); 
	return 'data:' . $mime . ';base64,' . $base64;
}

function download_to_data_uri($uri)
{
	$curl = curl_init($uri);
	curl_setopt($curl, CURLOPT_BINARYTRANSFER, true);
	curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
	curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($curl, CURLOPT_MAXREDIRS, 5);
	curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);

	$data = curl_exec($curl);

	$mimetype = curl_getinfo($curl, CURLINFO_CONTENT_TYPE);

	if(!$mimetype)
		$mimetype = 'application/octet-stream';
	
	return data_uri($data, $mimetype);
}

$uri = filter_input(INPUT_GET, 'uri', FILTER_VALIDATE_URL);

$callback = filter_input(INPUT_GET, 'callback', FILTER_VALIDATE_REGEXP, array('options' => array('regexp' => '{^[a-z0-9_\-\.]+$}')));

$callback_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_REGEXP, array('options' => array('regexp' => '{^[a-z0-9_\-\.]+$}')));

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 1728000');

if($callback || $callback_id)
	header('Content-Type: text/javascript');
else
	header('Content-Type: text/plain');

if($_SERVER['REQUEST_METHOD'] != 'GET')
	exit;


if(!$callback && $callback_id)
	$callback = sprintf("document.getElementById('%s').appendChild", $callback_id);

if(!$uri) {
	header('Status: 500 Internal Server Error');
	die('throw "invalid uri"');
}

header('Status: 200 OK');

if($callback)
	printf('(%s(document.createTextNode("%s")))', $callback, download_to_data_uri($uri));
else
	echo download_to_data_uri($uri);