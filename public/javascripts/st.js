var socket;
var room_num;
var bullets = {};
var firedBullets = {};
var bulletSpeed = 30;
var graApi = '//seccdn.libravatar.org/avatar';

function modifySit () {
	var sn = $("#sitno").val();
	// sn = sn.substring(4); // cut "seat"
	var nick = $("#nickname").val();
	if(nick === '') {
		$(".selected").removeClass("selected");
		$(".selected").removeClass("black-sit");
		return;
	}

	if(sn === '') {
		return;
	}

	$.post('/modify',
		{sitno:sn, nickname:nick, room:room_num},
		function(data){

			if(data.msg === 'success') {
				$("#"+sn).removeClass();
				$("#"+sn).addClass('sit');
				$("#"+sn).addClass('sitted');
				$("#"+sn).attr('title', nick);
				loadGravatar(function(){
					loadBlackList();
				});
			}
		},
		'json');
}

function clearSitWithSitno(sn){
	$.post('/modify',
		{sitno:sn, nickname:'', room:room_num},
		function(data){
			if(data.msg === 'success') {
				$("#"+sn).attr('style', '');
			}
		},
		'json');
}

function clearSit() {
	var sn = $("#sitno").val();
	if(sn === '') {
		return;
	}

	$.post('/modify',
		{
			sitno: sn,
			nickname: '',
			room: room_num
		},
		function(data){
			if(data.msg === 'success') {
				$("#"+sn).attr('style', '');
				$("#"+sn).removeClass();
				$("#"+sn).addClass('sit');
				$("#"+sn).attr('title', '空');
			} else {

			}
		},
		'json');
}

function loadSits(callback) {
	/**********************************************
	 *  :param callback: The success callback
	 **********************************************/

	$.get('/list/?room=' + room_num, function(data) {
		if(data.msg !== 'success')
			return

		for(var k in data.seats) {
			var seat = data.seats[k];
			$('#' + seat.no).attr('title', seat.name);
			$('#' + seat.no).addClass('sitted');
		}
		if (isFunction(callback))
			callback();
	}, 'json');
}

function loadBlackList(callback) {
	/**********************************************
	 *  :param callback: The success callback
	 **********************************************/

	$.get('/black-list', function(data) {
		console.log(data.msg)
		if(data.msg !== 'success')
			return;

		var list = data.list;
		console.log('black list: ', list);
		for(k in list) {
			$("a[title='"+list[k].name+"']").addClass('black-sit');
		}
		if (isFunction(callback))
			callback();
	}, 'json');
}

function initSocketIO(success_cb) {
	/*************************************************************************
	 *  :param success_cb: The callback after connect/reconnect successfully.
	 *************************************************************************/

	console.log('init socket.io');

	socket = io.connect('//' + location.hostname + ':' + location.port);

	socket.on('connect', function(){
		removeLoadingAnimation();
		if (isFunction(success_cb)) {
			success_cb();
		}
	})

	socket.on('reconnect', function(){
		removeLoadingAnimation();
		if (isFunction(success_cb)) {
			success_cb();
		}
	})

	socket.on('reconnecting', function(){
		$('.dark-cover').show();
	})

	socket.on('sit_md', function (data) {
		if(data.room === room_num) {
			var sn = data.sitno;
			var nick = data.nickname;
			var oldSeat = data.oldSeat;
			console.log('old ' + oldSeat);

			if(oldSeat != undefined) {
				clearSitWithSitno(oldSeat);
			}

			console.log(data);
			$("#"+sn).removeClass("selected");
			$("#"+sn).addClass("sitted");
			$("#"+sn).attr("title", nick);
		}
	});

	socket.on('sit_clr', function (data) {
		if(data.room === room_num) {
			var sn = data.sitno;
			$("#"+sn).attr('style', '');
			$("#"+sn).removeClass();
			$("#"+sn).addClass('sit');
			$("#"+sn).attr('title', '空');
		}
	});

	socket.on('irc_msg', function (data) {
		var tmpArr = data.msg.split(':');
		var from = data.from;
		var to = '';
		var message = '';
		if(tmpArr.length > 1){
			to = tmpArr[0];
			message = data.msg.substr(to.length + 1);
		} else {
			message = data.msg;
		}

		console.log("IRC Message : " + from + " -> " + to + " : " + message);

		if(to !== '' && $("a[title='" + to + "']").length != 0) {
			var locFrom = $("a[title='" + from + "']").position();
			var locTo = $("a[title='" + to + "']").position();
			var rnd = Math.random();

			var bulletId = hex_md5('' + rnd);
			while(typeof bullets[bulletId] !== 'undefined') {
				rnd = Math.random();
				bulletId = hex_md5(rnd);
			}

			var bcvs = '<div id="' + bulletId + '" class="irc-bullet" style="top:' + (locFrom.top) + 'px; left:' + (locFrom.left)+ 'px;"></div>'
			var bullet = {
				from: from,
				to: to,
				locFrom: locFrom,
				locTo: locTo
			};

			bullets[bulletId] = bullet;
			$('body').append(bcvs);

			$('#' + bulletId).animate({
					left:locTo.left + 'px',
					top:locTo.top + "px"
				},
				400
			 );
		}

		html =  "<div class='msg-bubble'>" + message + "</div>";
		$("a[title='" + from + "']").prepend(html);
		setTimeout(function() {
			$("a[title='" + from + "'] .msg-bubble").remove();
		}, 3000);
	});

	socket.on('conf_msg', function(data) {
		console.log('Conference Message : ' + data.msg);
		html = '<div class="conf-msg" id="conf-msg">' + data.msg + '</div>';
		$('body').prepend(html);

		setTimeout(function() {
			$('#conf-msg').remove();
		}, 10000);
	});

	socket.on('reload_gravatar', function(data) {
		console.log('reload gra' + data);
		var k = data.ircNick;
		var emailHash = data.emailHash;
		var graURL = graApi + '/' + emailHash;
		$('a[title='+k+']').addClass('gravatar-sit');
		$('a[title='+k+']').attr('style', 'background-image: url(' + graURL + '?d=mm&s=150);');
		console.log('change gra finished');
	});
}

function loadGravatar(callback) {
	/**********************************************
	 *  :param callback: The success callback
	 **********************************************/

	$.get('/list-gra', function(data) {
		if(data.msg !== 'success')
			return;

		var graList = data.list;
		console.log('gra list:' + graList)
		for(var k in graList) {
			var ircNick = graList[k].ircNick;
			var emailHash = graList[k].emailHash;
			var graURL = graApi + '/' + emailHash;
			$("a[title='"+ircNick+"']").addClass('gravatar-sit');
			$("a[title='"+ircNick+"']").attr('style', 'background-image: url(' + graURL + '?d=mm&s=150);');
		}
		if (isFunction(callback))
			callback();
	});
}

function help() {
	window.scrollTo(0, 0);
	var helpImageHtml = '<img class="help" src="/images/help.png"></img>';
	$('html').append(helpImageHtml);
	$('.help').click(function() {
		$('.help').remove();
	});
}

function init(){
	/**********************************************
	 *  Init order
	 *		*. loadSits();
	 *		*. loadBlackList();
	 *		*. loadGravatar();
	 *		*. initSocketIO();
	 **********************************************/
	room_num = $('#room').val();
	console.log('get room : ' + room_num);

	loadSits(function(){
		loadGravatar(function(){
			loadBlackList();
		})
	})
	initSocketIO();
}

function removeLoadingAnimation(){
	var loading = $('.dark-cover')
	if(loading.length > 0)
		$('.dark-cover').hide();
}

$(document).ready(function(){
	init();

	$('.sit').click(function(){
		if(this.className.indexOf('selected') != -1){
			$(".selected").removeClass("selected");
			$("#sitno").val('');
			$("#nickname").val('');
		} else {
			$(".selected").removeClass("selected");
			this.className = "selected " + this.className;
			$("#sitno").val(this.id);
			if(this.title === '空') {
				$("#nickname").val('');
			} else {
				$("#nickname").val(this.title);
			}
		}
	});

	$('#modify-trigger-btn').click(function(){
		$footer = $('.footer');
		if($footer.css('display') === 'none'){
			$footer.css('display', 'block');
		}
		else{
			$footer.attr('style', null);
		}
	})
});
