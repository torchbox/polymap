<?php
	$input = file_get_contents('php://input');
	$ch = curl_init();
	curl_setopt($ch,CURLOPT_URL,'http://tbxpolymap.appspot.com/create');
	curl_setopt($ch,CURLOPT_RETURNTRANSFER, TRUE);
	curl_setopt($ch,CURLOPT_POST, TRUE);
	curl_setopt($ch,CURLOPT_POSTFIELDS, $input);
	$result = curl_exec($ch);
	curl_close($ch);
	echo $result;
?>
