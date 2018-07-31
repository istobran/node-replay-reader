const fsPromises = require('fs').promises;

// Red Alert 3 Constant
const MAGIC_SIZE = 17;
const U1_SIZE = 31;
const U2_SIZE = 20;

var i = 0;
function up_i(len) {
	return i += len;
}

function resolveString(buffer, offset) {
	var end = -1;
	for (var t = offset; t < buffer.length; t+=2) {
		var tempval = (buffer[t+1] << 8) + buffer[t];
		// console.log(`buffer[t+1]: ${buffer[t+1]}, buffer[t]: ${buffer[t]}, val: ${tempval}`);
		if (tempval === 0x0000) {
			end = t + 2;
			up_i(end - offset);
			break;
		}
	}
	if (end === -1) {
		return null;
	} else {
		return buffer.toString("utf-16le", offset, end);
	}
}

function resolvePlayers(buffer, offset, nop, gametype) {
	const player_data = [];
	for (var t = 0; t < nop + 1; t++) {
		let player = {};
		player.player_id = buffer.slice(i, up_i(4)).readUInt32LE();
		player.player_name = resolveString(buffer, i);
		if (gametype === 0x05) {
			player.team_number = buffer.slice(i, up_i(1)).readUInt8();
		}
		player_data.push(player);
	}
	return player_data;
}

function analysisGameInfo(source) {
	var map = new Map(source.split(";").filter(Boolean).map(item => item.split("=")));
	console.log("resmap formatted:", map);
	var playerInfo = map.get("S").split(":");
	var arr = playerInfo.map(p => p.split(",")).map(p => {
		if (p[0].charAt(0) === "H") {
			var ipaddr = p[1];
			var iparr = [];
			for (var i = 0; i < 4; i++) {
				iparr.push(parseInt(ipaddr.substr(i*2, 2), 16));
			}
			p[1] = iparr.join(".");
		}
		return p.join(",");
	});
	console.log("arr:\n", arr);
}

function resolveReplay(replay) {
	const buffer = Buffer.alloc(1024);
	replay.read(buffer, 0, 1024);
	console.log("result:", buffer);
	
	
	// 游戏录像头声明
	const str_magic = buffer.slice(i, up_i(MAGIC_SIZE)).toString("ascii");
	console.log("str_magic:", str_magic);

	// 游戏类型
	const gametype = buffer.slice(i, up_i(1)).readUInt8();
	console.log("gametype:", gametype);
	
	// 游戏版本号
	const vermajor = buffer.slice(i, up_i(4)).readUInt32LE();		// LE是小端写法，BE是大端写法
	const verminor = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log(`game version: ${vermajor}.${verminor}`);
	
	// build版本号
	const buildmajor = buffer.slice(i, up_i(4)).readUInt32LE();
	const buildminor = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log(`build version: ${buildmajor}.${buildminor}`);
	
	// 评论类型
	const commentary = buffer.slice(i, up_i(2)).readUInt16LE();
	console.log("commentary value:", commentary.toString(16));
	
	// 地图信息
	const match_title = resolveString(buffer, i);
	console.log("match_title:", match_title);
	const match_description = resolveString(buffer, i);
	console.log("match_description:", match_description);
	const match_map_name = resolveString(buffer, i);
	console.log("match_map_name:", match_map_name);
	const match_map_id = resolveString(buffer, i);
	console.log("match_map_id:", match_map_id);
	
	// 玩家数
	const number_of_players = buffer.slice(i, up_i(1)).readUInt8();
	console.log("number of players:", number_of_players);
	
	// 玩家列表
	const player_data = resolvePlayers(buffer, i, number_of_players, gametype);
	console.log("player_data:", player_data);
	
	// 一些元数据
	const offset = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("offset:", offset);
	const str_repl_length = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("str_repl_length:", str_repl_length);
	const str_repl_magic = buffer.slice(i, up_i(str_repl_length)).toString("ascii");
	console.log("str_repl_magic:", str_repl_magic);
	const mod_info = buffer.slice(i, up_i(22)).toString("ascii");
	console.log("mod_info:", mod_info);
	const timestamp = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("timestamp:", timestamp, new Date(timestamp*1e3));
	
	// unknown bytes
	const unknown1 = buffer.slice(i, up_i(U1_SIZE));
	console.log("unknown1:", unknown1);
	
	// 头部信息
	const header_len = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("header_len:", header_len);
	const header = buffer.slice(i, up_i(header_len)).toString("ascii");
	console.log("header:", header);
	
	// 保存者的 index
	const replay_saver = buffer.slice(i, up_i(1)).readUInt8();
	console.log("replay_saver:", replay_saver);
	
	const zero3 = buffer.slice(i, up_i(4)).readUInt32LE();
	const zero4 = buffer.slice(i, up_i(4)).readUInt32LE();
	
	// 保存时的文件名
	const filename_length = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("filename_length:", filename_length);
	const filename = buffer.slice(i, up_i(filename_length*2)).toString("ucs2");
	console.log("filename:", filename);
	
	// 日期
	// 0: year, 1: month, 2: weekday (0-6 = Sun-Sat), 3: day, 4: hour, 5: minute, 6: second.
	const date_time = Array.from(new Array(8), (i, k) => k).map(item => {
		return buffer.slice(i, up_i(2)).readUInt16LE().toString();
	}).join("/");
	console.log("date_time:", date_time);
	
	// 版本号字符串
	const vermagic_len = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("vermagic_len:", vermagic_len);
	const vermagic = buffer.slice(i, up_i(vermagic_len)).toString("ascii");
	console.log("vermagic:", vermagic);
	
	const magic_hash = buffer.slice(i, up_i(4)).readUInt32LE();
	console.log("magic_hash:", magic_hash);
	
	const zero5 = buffer.slice(i, up_i(1)).readUInt8();
	const unknown2 = buffer.slice(i, up_i(U2_SIZE));
	
	console.log("pointer end:", i);
	
	// 分析游戏信息
	analysisGameInfo(header);
}

async function openAndClose(filename) {
  let filehandle;
  try {
	console.log("reading file:", filename);
    filehandle = await fsPromises.open(filename, 'r');
	console.log("filehandle:", filehandle);
	resolveReplay(filehandle);
  } catch(e) {
	console.error(e)  
  } finally {
    if (filehandle !== undefined)
      await filehandle.close();
  }
}
openAndClose(process.argv[2])