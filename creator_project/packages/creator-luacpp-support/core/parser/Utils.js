const path      = require('path');
const fs        = require('fs');
const state     = require('./Global').state;
const Utils     = require('../Utils');
const Constants = require('../Constants'); //leon

const klawSync  = require('../leon/klaw-sync/klaw-sync');

/**
 * Get resource path by uuid.
 * The return value:
 * @fullpath: full path of the resource
 * @relative_path: relative path to assets folder or creator default asset path
 */
let get_relative_full_path_by_uuid = function(uuid) {

	if (uuid in state._uuid)
		return state._uuid[uuid];
	let fullpath = Editor.remote.assetdb.uuidToFspath(uuid);
	let mountInfo = Editor.remote.assetdb.mountInfoByUuid(uuid);

	if (fullpath == null)  Utils.log("fullpath null:  make sure particle in component is 'exported' back to plist file.");
	if (mountInfo == null) Utils.log("mountInfo null: make sure particle in component is 'exported' back to plist file.");

	let root = mountInfo.path;
	let relative_path = fullpath.substring(root.length + 1);

	let result = {
		fullpath: fullpath,
		relative_path: relative_path
	};
	state._uuid[uuid] = result;

	return result;
}

//leon
let fixFullpath = function(fullpath) {
	console.log("fixFullpath: Entering...");

//	count   = (fullpath.match(/\\/g) || []).length

//	position = fullpath.lastIndexOf('\\');
//	fixpath = fullpath.substring(0, position);
//	return fixpath;

//	let a = "D:\\W\\yoozoo\\tasks\\20190107-cocoscreator\\third\\assets\\Texture\\1st\\light-particle-alpha.png\\light-particle-alpha"

	console.log("* " + fullpath)

	let match_result = fullpath.match( /([\w-]+)\.png/ ); // [0] light-particle-alpha.png [1] light-particle-alpha

//	let b = match_result[0]; //found light-particle-alpha.png
//	b = b.substring(0, b.length-4); //remove .png suffix
//	console.log("* " + b) //light-particle-alpha

	let b = match_result[1]; //light-particle-alpha
	console.log("* " + b) //light-particle-alpha


	//若找到兩次
	let re = new RegExp(b, "g");
	let count = (fullpath.match(re) || []).length;
	if (count > 1)
	{
		//$('#msg').html("hehe")
		let patched_fullpath = fullpath.substring(0, fullpath.length-b.length-1); // 移除第二個(末端)light-particle-alpha. -1 remove the suffix-backslash
		console.log("* patched: " + patched_fullpath)

		return patched_fullpath;
	}

	console.log("* unchanged: " + fullpath)
	return fullpath;

	console.log("fixFullpath: Exit.");

}

let containsAny = (str, items) => {
	for(let i in items){
		let item = items[i];
		if (str.indexOf(item) > -1) {	//leon: > -1 means it contains string
			return true;
	}   }
	return false;
}

/**
 * //leon: Get resource path by uuid, targeting .atlas files
 * The return value:
 * @fullpath: full path of the resource
 * @relative_path: relative path to assets folder or creator default asset path
 */
let get_relative_full_leon_resources_path_by_uuid = (uuid, exts) => { //leon

//	//leon: https://stackoverflow.com/a/15202003
//	function containsAny(str, items) {
//		for(let i in items){
//			let item = items[i];
//			if (str.indexOf(item) > -1) {	//leon: > -1 means it contains string
//				return true;
//		}   }
//		return false;
//	}

//d	if (uuid == "9e7382d4-5b96-493f-9f3b-1f4e0fe3c110")
//d		console.log("d hihihi atlas 1482");

	//this is specifically for spine assets
//	let exts = ['.atlas', '.plist'];

//	let rfp = get_relative_full_path_by_uuid(uuid);
	let fullpath = Editor.remote.assetdb.uuidToFspath(uuid);

//	if (fullpath.indexOf(".atlas") !== -1) //leon: !== means if contains string
	if (containsAny(fullpath, exts)) //leon: !== means if contains string
	{
	//	let mountInfo = Editor.remote.assetdb.mountInfoByUuid(uuid);
	//	let root = mountInfo.path;
	//	
	//	let relative_path = fullpath.substring(root.length + 1);
	//	
	//	let result = {
	//		fullpath: fullpath,
	//		relative_path: relative_path
	//	};
	//	
	//	return result;
	//	return get_resource_fullpath_from_uuid(uuid, fullpath);
		return get_relative_full_path_by_uuid(uuid, fullpath);
	}

	return undefined;
}


//----------------------------------------------------------
//leon: param: fullpath is optional
let get_resource_fullpath_from_uuid = function(uuid, fullpath = null) {	//leon

	//fullpath
	//https://stackoverflow.com/a/894877 (originally null is 'undefined')
//	fullpath = typeof fullpath !== null ? fullpath : Editor.remote.assetdb.uuidToFspath(uuid);
	fullpath = Editor.remote.assetdb.uuidToFspath(uuid);


	//relative path
	let mountInfo     = Editor.remote.assetdb.mountInfoByUuid(uuid);
	let root          = mountInfo.path;
	let relative_path = fullpath.substring(root.length + 1);

	//bundle them together
	let result = {
		fullpath: 		fullpath,
		relative_path: 	relative_path
	};

	return result;
}


//----------------------------------------------------------
//leon: for now we only handle particle .plist
let get_relative_full_particle_path_by_uuid = function(uuid) { //leon

	if (uuid == "9e7382d4-5b96-493f-9f3b-1f4e0fe3c110")
		console.log("d hihihi atlas 1482");

//	let rfp = get_relative_full_path_by_uuid(uuid);
	let fullpath = Editor.remote.assetdb.uuidToFspath(uuid);

	if (fullpath.indexOf("particle") !== -1 && fullpath.indexOf(".plist") !== -1) //leon: !== means if contains string
	{
		let mountInfo = Editor.remote.assetdb.mountInfoByUuid(uuid);
		let root = mountInfo.path;

		let relative_path = fullpath.substring(root.length + 1);

		let result = {
			fullpath: fullpath,
			relative_path: relative_path
		};

		return result;
	}

	return undefined;
}


let get_sprite_frame_json_by_uuid = function(uuid) {
	let jsonfile = uuidinfos[uuid];
	if (jsonfile) {
		let contents = fs.readFileSync(jsonfile);
		let contents_json = JSON.parse(contents);
		return contents_json;
	}
	else
		return null;
}

let is_sprite_frame_from_texture_packer = function(uuid) {
	let json = get_sprite_frame_json_by_uuid(uuid);
	if (json) 
		return json.content.atlas !== '';
	else
		return false;
}


/**
 * The sprite frame name will include path information if it is not a texture packer
 */
let get_sprite_frame_name_by_uuid = function(uuid) {
	if (uuid in state._sprite_frames) {
		let uuid_info = state._sprite_frames[uuid];
		if (uuid_info.is_texture_packer)
			return uuid_info.name;
		else
			return uuid_info.texture_path;
	}
	else {
		let contents_json = get_sprite_frame_json_by_uuid(uuid);
		if (contents_json) {
			let metauuid;
			let texture_uuid = contents_json.content.texture;
			let is_texture_packer = false;
			if (contents_json.content.atlas !== '') {
				// texture packer
				metauuid = contents_json.content.atlas;
				is_texture_packer = true;
			}
			else
				// a single picture
				metauuid = texture_uuid;

			// handle texture path

			let path_info = get_relative_full_path_by_uuid(texture_uuid);

			// get texture frames information
			let meta = Editor.remote.assetdb._uuid2meta[metauuid].__subMetas__;
			let found_sprite_frame_name = null;
			Object.keys(meta).forEach(sprite_frame_name => {
				let sprite_frame_info = meta[sprite_frame_name];
				sprite_frame_info.name = sprite_frame_name;
				sprite_frame_info.texture_path = path_info.relative_path;
				sprite_frame_info.is_texture_packer = is_texture_packer;

				let sprite_frame_uuid = sprite_frame_info.uuid; 
				state._sprite_frames[sprite_frame_uuid] = sprite_frame_info;

				if (sprite_frame_uuid == uuid) {
					if (is_texture_packer)
						found_sprite_frame_name = sprite_frame_name;
					else
						found_sprite_frame_name = sprite_frame_info.texture_path;
				}
			});
			return found_sprite_frame_name;
		}
		else {
			module.exports.log('can not get sprite frame name of uuid ' + uuid);
			return null;
		}
	}
}

let get_font_path_by_uuid = function(uuid) {
	if (uuid in state._uuid)
		return state._uuid[uuid].relative_path;
	else {
		let jsonfile = uuidinfos[uuid];
		if (jsonfile) {
			let current_dir = path.basename(jsonfile, '.json');
			let contents = fs.readFileSync(jsonfile);
			let contents_json = JSON.parse(contents);
			let type = contents_json.__type__;
			// creator copy resources into the uuid folder
			let res_dir = path.join(path.dirname(jsonfile), uuid);

			if (type === 'cc.BitmapFont') {
				// png path
				let png_uuid = contents_json.spriteFrame.__uuid__;
				let json_png = JSON.parse(fs.readFileSync(uuidinfos[png_uuid]));
				let png_path_info = get_relative_full_path_by_uuid(json_png.content.texture);
				state._uuid[png_uuid] = png_path_info;

				// fnt path
				state._uuid[uuid] = {
					fullpath: Utils.replaceExt(png_path_info.fullpath, '.fnt'),
					relative_path: Utils.replaceExt(png_path_info.relative_path, '.fnt')
				}

				return state._uuid[uuid].relative_path;
			}
			else if (type === 'cc.TTFFont') {
				state._uuid[uuid] = {
					fullpath: path.join(res_dir, contents_json._rawFiles[0]),
					relative_path: current_dir + '/' + contents_json._rawFiles[0]
				}

				return state._uuid[uuid].relative_path;
			}
			else {
				return 'xxx';
			}
		}
		else {
			module.exports.log('can not get bmfont path of uuid ' + uuid);
			return 'xxx';
		}
	}
}

/**
 * return json file path and atlas path
 */
let get_spine_info_by_uuid = function (uuid) {
	if (uuid in state._uuid)
		return state._uuid[uuid];

	let jsonfile = uuidinfos[uuid];
	if (jsonfile) {
		let contents = fs.readFileSync(jsonfile);
		let contents_json = JSON.parse(contents);
		let current_dir = path.basename(jsonfile, '.json');
		
		let res_dir = path.join(path.dirname(jsonfile), uuid);
		
		let files = fs.readdirSync(res_dir);
		files.forEach(function(file) {
			let fullpath = path.join(res_dir, file);
			//FIXME: have more than one json file?
			state._uuid[uuid] = {fullpath: fullpath, relative_path: current_dir + '/' + file};
		});
		
	//leon: atlas_url has bug	
		// get atlas path
	//	state._uuid[uuid].atlas_url = get_relative_full_path_by_uuid(contents_json.atlasUrl.__uuid__);
	//r	state._uuid[uuid].atlas_url = `${contents_json._name}.atlas`;

		let short_atlas_url = `${contents_json._name}.atlas`;

		///leon: migrate code from ConvertFireToJson.js
		let filterCallback = f => f.path.indexOf('.atlas') > -1 && !(f.path.indexOf('.meta') > -1)
		let original_atlas_files = klawSync(Constants.ASSETS_PATH, {nodir: true, traverseAll: true, filter: filterCallback});

		let protect_count = 0;
		Object.keys(original_atlas_files).forEach( k => {
		//	consold.log(original_atlas_files[k]);
		//	console.log(k);
			let atlas_full_pathname = original_atlas_files[k].path;
			if (atlas_full_pathname.indexOf(short_atlas_url) > -1)
			{
				//leon: relpath = full - start path; remove the first \; replace \ to /
			//	let relpathname = atlas_full_pathname.replace(Constants.ASSETS_PATH, '').substr(1).replace(/\\/g, '/');
				let relpathname = atlas_full_pathname.replace(Constants.ASSETS_PATH, '').substr(1); // backslash style
				state._uuid[uuid].atlas_url = {fullpath: atlas_full_pathname, relative_path: relpathname};

				protect_count++;
			}
		});
		if (protect_count > 1) Utils.log(`! duplicate spine .atlas file: ${state._uuid[uuid].atlas_url}`);


		// add to _uuid to copy resources
		state._uuid[uuid + '-atlas'] = state._uuid[uuid].atlas_url;

		// get textures path
		for (let i = 0, len = contents_json.textures.length; i < len; ++i) {
			let texture = contents_json.textures[i];
			// just create a unique key
			let new_key = uuid + '-texture-' + i;
			state._uuid[new_key] = get_relative_full_path_by_uuid(texture.__uuid__);
		}

		return state._uuid[uuid];
	}
}

let get_tiledmap_path_by_uuid = function (uuid) {
	if (uuid in state._uuid)
		return state._uuid.relative_path;

	// from the json file, we can only get texture path
	// so should use the texture path to get tmx path
	let jsonfile = uuidinfos[uuid];
	if (jsonfile) {
		let contents = fs.readFileSync(jsonfile);
		let contents_json = JSON.parse(contents);

		// record texture path
		let tmx_texture_info = {};
		contents_json.textures.forEach(function(texture_info) {
			tmx_texture_info = get_relative_full_path_by_uuid(texture_info.__uuid__);
		});

		// get tmx path
		let tmx_relative_path = Utils.replaceExt(tmx_texture_info.relative_path, '.tmx');
		let tmx_fullpath = Utils.replaceExt(tmx_texture_info.fullpath, '.tmx');
		state._uuid[uuid] = {
			relative_path: tmx_relative_path,
			fullpath: tmx_fullpath
		};

		return tmx_relative_path;
	}
}

let DEBUG = false;
log = function(s) {
	if (DEBUG)
		Utils.log(s);
}

let create_node = function (node_type, node_data) {
	const Node = require('./Node');
	const Button = require('./Button');
	const Canvas = require('./Canvas');
	const EditBox = require('./EditBox');
	const Label = require('./Label');
	const ParticleSystem = require('./ParticleSystem');
	const ProgressBar = require('./ProgressBar');
	const RichText = require('./RichText');
	const ScrollView = require('./ScrollView');
	const SpineSkeleton = require('./SpineSkeleton');
	const Sprite = require('./Sprite');
	const TiledMap = require('./TiledMap');
	const VideoPlayer = require('./VideoPlayer');
	const WebView = require('./WebView');
	const Slider = require('./Slider');
	const Toggle = require('./Toggle');
	const ToggleGroup = require('./ToggleGroup');
	const PageView = require('./PageView');
	const Mask = require('./Mask');
	const Prefab = require('./Prefab');
	const DragonBones = require('./DragonBones');
	const MotionStreak = require('./MotionStreak');

	let n = null;
	if (node_type === 'cc.Node')
		n = new Node(node_data);
	else if (node_type === 'cc.Sprite')
		n = new Sprite(node_data);
	else if (node_type === 'cc.Canvas')
		n = new Canvas(node_data);
	else if (node_type === 'cc.Label')
		n = new Label(node_data);
	else if (node_type === 'cc.RichText')
		n = new RichText(node_data);
	else if (node_type === 'cc.Button')
		n = new Button(node_data);
	else if (node_type === 'cc.ProgressBar')
		n = new ProgressBar(node_data);
	else if (node_type === 'cc.ScrollView')
		n = new ScrollView(node_data);
	else if (node_type === 'cc.EditBox')
		n = new EditBox(node_data);
	else if (node_type === 'cc.TiledMap')
		n = new TiledMap(node_data);
	else if (node_type === 'cc.ParticleSystem')
		n = new ParticleSystem(node_data);
	else if (node_type === 'sp.Skeleton')
		n = new SpineSkeleton(node_data);
	else if (node_type === 'cc.VideoPlayer')
		n = new VideoPlayer(node_data);
	else if (node_type === 'cc.WebView')
		n = new WebView(node_data);
	else if (node_type === 'cc.Slider')
		n = new Slider(node_data);
	else if (node_type === 'cc.Toggle')
		n = new Toggle(node_data);
	else if (node_type === 'cc.ToggleGroup')
		n = new ToggleGroup(node_data);
	else if (node_type === 'cc.PageView')
		n = new PageView(node_data);
	else if (node_type === 'cc.Mask')
		n = new Mask(node_data);
	else if (node_type === 'cc.Prefab') 
		n = new Prefab(node_data);
	else if (node_type === 'dragonBones.ArmatureDisplay')
		n = new DragonBones(node_data);
	else if (node_type === 'cc.MotionStreak')
		n = new MotionStreak(node_data);

	if (n != null)
		n.parse_properties();
	   
	return n;
}

/**
 * remove a child from node's children by child's id
 * @param {node} the Node that to be applied to 
 * @param {id} child's id
 */
let remove_child_by_id = function (node, id) {
	let children = node._node_data._children;
	for (let i = 0, len = children.length; i < len; ++i) {
		let child = children[i];
		if (child.__id__ === id) {
			children.splice(i, 1);
			break;
		}
	}
}

//leon: cleanup null/undefined attributes
//https://stackoverflow.com/a/286162
function clean(obj) {
  for (var propName in obj) { 
	if (obj[propName] === null || obj[propName] === undefined) {
	  delete obj[propName];
	}
  }
}

module.exports = {
	get_relative_full_path_by_uuid          			: get_relative_full_path_by_uuid,
//	get_resource_fullpath_from_uuid						: get_resource_fullpath_from_uuid,						//leon
	get_relative_full_leon_resources_path_by_uuid 		: get_relative_full_leon_resources_path_by_uuid,	//leon
	fixFullpath 										: fixFullpath,											//leon
	get_sprite_frame_name_by_uuid           			: get_sprite_frame_name_by_uuid,
	get_font_path_by_uuid                   			: get_font_path_by_uuid,
	get_spine_info_by_uuid                  			: get_spine_info_by_uuid,
	get_tiledmap_path_by_uuid               			: get_tiledmap_path_by_uuid,
	create_node                             			: create_node,
	log                                     			: log,
	remove_child_by_id                      			: remove_child_by_id,
	get_sprite_frame_json_by_uuid           			: get_sprite_frame_json_by_uuid,
	is_sprite_frame_from_texture_packer     			: is_sprite_frame_from_texture_packer,
	clean                                   			: clean,
	containsAny											: containsAny,
}
