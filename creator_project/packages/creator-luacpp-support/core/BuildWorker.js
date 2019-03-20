
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";
const Path = require('path');

const Utils = require('./Utils');
const Constants = require('./Constants');
const Fs = require('fire-fs');
const Del = require('del')
const parse_fire = require('./parser/ConvertFireToJson');
const parse_utils = require('./parser/Utils')

let global_state = require('./parser/Global').state;

const {WorkerBase, registerWorker} = require('./WorkerBase');

const plugin_profile = 'profile://project/creator-luacpp-support.json';

const vkbeautify = require('./leon/vkbeautify.0.99.3');

class BuildWorker extends WorkerBase {
	run(state, callback) {
		Utils.recordBuild();

		Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'start', 0);
		Utils.log('[creator-luacpp-support] build start');

		this._callback = callback;
		this._state = state;

		// clean old json or ccreator files
		Fs.emptyDirSync(Constants.JSON_PATH);
		Fs.emptyDirSync(Constants.CCREATOR_PATH);

		Utils.getAssetsInfo(function(uuidmap) {
			let copyReourceInfos      = this._convertFireToJson(uuidmap);
			let dynamicLoadRes        = this._getDynamicLoadRes(uuidmap);
			Object.assign(copyReourceInfos.theUuids, dynamicLoadRes);
			this._compileJsonToBinary(function() {
				this._copyResources(copyReourceInfos.theUuids);
				this._appendResourcesParticleWithTextureNameKey(uuidmap); 						//leon: copy spine atlas files
				this._copyResourcesParticleSpriteFrames(copyReourceInfos.particleSpriteFrames);	//leon: copy spine atlas files
				Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'finish', 100);
				this._callback();
				Utils.log('[creator-luacpp-support] build end');
			}.bind(this));

		}.bind(this));
	}

	_convertFireToJson(uuidmap) {
		let fireFiles = this._getFireList();
		let copyReourceInfos = parse_fire(fireFiles, 'creator', /*this._state.path,*/ Constants.JSON_PATH, uuidmap);

		return copyReourceInfos;
	}

	// this is for "scene file" only (.fire)
	// .json -> .ccreator
	_compileJsonToBinary(cb) {
		const jsonFiles = this._getJsonList();

		let i = 0;
		jsonFiles.forEach(function(file) {
			let subFolder = Path.dirname(file).substr(Constants.JSON_PATH.length + 1);
			let creatorPath = Path.join(Constants.CCREATOR_PATH, subFolder);
			let params = ['-b', '-o', creatorPath, Constants.CREATOR_READER_FBS, file];

			Utils.runcommand(Constants.FLATC, params, function(code){
				if (code != 0)
					Utils.log('[creator-luacpp-support] convert ' + file + ' to .ccreator error');

				++i;
				if (i === jsonFiles.length)
					cb();
			});
		});
	}

	//leon: copy particle資源「內」使用到的 貼圖.
	_copyResourcesParticleSpriteFrames(particleSpriteFrames_) { //leon
		let result = {};
		
		Object.keys(particleSpriteFrames_).forEach(sf_id => {
			console.log(sf_id);
			console.log(particleSpriteFrames_[sf_id].__uuid__);
			result[particleSpriteFrames_[sf_id].__uuid__] = parse_utils.get_relative_full_leon_resources_path_by_uuid(particleSpriteFrames_[sf_id].__uuid__, ['.png']);
		});	
		
		parse_utils.clean(result);	//leon: remove null/undefined attributes

	//leon: 好像不需要了。。。喵？？	
	//	//leon: clean up path. don't know why. dirty patch
	//	Object.keys(result).forEach( data => {
	//		let texture_uuid = result[data];
	//		texture_uuid.fullpath = parse_utils.fixFullpath(texture_uuid.fullpath);
	//		texture_uuid.relative_path = parse_utils.fixFullpath(texture_uuid.relative_path);
	//		let FINAL_relative_path_forwardslash = texture_uuid.relative_path.replace(/\\/g, '/');
	//		console.log("bp");
	//	});

			let projectRoot = this._state.path;
			let resdst = Path.join(projectRoot, 'Resources');
			    resdst = Path.join(resdst, Constants.RESOURCE_FOLDER_NAME);

		Object.keys(result).forEach(uuid_key => {
			
			let pathInfo = result[uuid_key];

			let src = pathInfo.fullpath;
			let dst = Path.join(resdst, pathInfo.relative_path);

			Fs.ensureDirSync(Path.dirname(dst));
			Fs.copySync(src, dst);

			console.log("particle texture " + uuid_key + " sucessfully copied.");
		});

	}

	//leon: modify particle .plist file and copy it. copy spine .atlas files directly (to EXPORT folder)
	//leon: 幹為什麼要把兩種不同資源放在一起 黑人問號???
	_appendResourcesParticleWithTextureNameKey(uuidmap_) { //leon
		let result = {};
		let resourcesPath = Path.join(Constants.ASSETS_PATH, 'resources');

		let result_particle_textures = {};

	//	Object.keys(uuidmap_).forEach(function(uuid) {
	//		if(uuidmap_[uuid].indexOf(resourcesPath) < 0)
	//			return true;
	//		
	//		result[uuid] = parse_utils.get_relative_full_path_by_uuid(uuid);
	//	});

		Object.keys(uuidmap_).forEach(uuid => {
		//d	console.log(uuid);
		//!	if(uuidmap_[uuid].indexOf(resourcesPath) < 0) return true;
		//	result[uuid] = parse_utils.get_relative_full_atlas_path_by_uuid(uuid);
			result[uuid] = parse_utils.get_relative_full_leon_resources_path_by_uuid(uuid, ['.atlas', '.plist']);
		//x	result_particle_textures[uuid] = parse_utils.get
		});

	

		parse_utils.clean(result);	//leon: remove null/undefined attributes
	//d	return result;	

		Object.keys(result).forEach(uuid => {
			let projectRoot = this._state.path;
			let resdst = Path.join(projectRoot, 'Resources');
			    resdst = Path.join(resdst, Constants.RESOURCE_FOLDER_NAME);
			let pathInfo = result[uuid];

			if (parse_utils.containsAny(pathInfo.relative_path, ['.plist']))
			{
				// update particle .plist file with textFileName key
				let new_particle_plist_str = this._updateParticleFileWithTextureFileNameKey(pathInfo);

				//write updated particle .plist string to dst-file
				if (new_particle_plist_str !== null)
				{
					// copy 
					let src = pathInfo.fullpath;
					let dst = Path.join(resdst, pathInfo.relative_path);
					Fs.ensureDirSync(Path.dirname(dst));
				//	Fs.copySync(src, dst);
					Fs.writeFileSync(dst, new_particle_plist_str, {encoding: 'utf8'});

					console.log("particle texture " + uuid + " sucessfully modified.");
				}
			}
			else // copy .atlas files
			{
				let src = pathInfo.fullpath;
				let dst = Path.join(resdst, pathInfo.relative_path);
				Fs.ensureDirSync(Path.dirname(dst));
				Fs.copySync(src, dst);
			}
		});

		console.log("bp");
	}

	//leon: inner function: find spriteFrameUuid node among spriteFrameUuids list
	__findfindfind(spriteFrameUuids_) {
		for (let i=0; i<spriteFrameUuids_.length; i++)
		{
			if (spriteFrameUuids_[i].innerHTML === "spriteFrameUuid")
				return spriteFrameUuids_[i];
		}
		return null;		
	}

	//leon: return a new .plist xml string with updated-texture-filepath from uuid
	_updateParticleFileWithTextureFileNameKey(pathInfo_) {
	
	//https://www.w3schools.com/xml/xml_parser.asp
	//d	let text = 	"<bookstore><book>" +
	//d				"<title>Everyday Italian</title>" +
	//d				"<author>Giada De Laurentiis</author>" +
	//d				"<year>2005</year>" +
	//d				"</book></bookstore>";


		/// READ PLIST FILE
		let plist_text = Fs.readFileSync(
		//	"D:/W-/20190122-cocoscreator-export-for-c/01-particle/Resources/creator/Particle/fire01.plist",
			pathInfo_.fullpath,
			{encoding: 'utf8', flag: 'r'}
		);

		let parser = new DOMParser();
		let xmlDoc = parser.parseFromString(plist_text, "text/xml");

		/// GET SPRITEFRAMEUUID
		let spriteFrameUuids = xmlDoc.getElementsByTagName("key");
		let spriteFrameUuidNode = this.__findfindfind(spriteFrameUuids);


		/// FIND TEXTURE REALPATH FROM UUID
		if (spriteFrameUuidNode)
		{
			let nextNode = spriteFrameUuidNode.nextElementSibling;

		//	let texture_uuid = parse_utils.get_resource_fullpath_from_uuid(nextNode.innerHTML);
			let texture_uuid = parse_utils.get_relative_full_path_by_uuid(nextNode.innerHTML);

			//leon: don't know why. dirty patch
			texture_uuid.fullpath = parse_utils.fixFullpath(texture_uuid.fullpath);
			texture_uuid.relative_path = parse_utils.fixFullpath(texture_uuid.relative_path);
			let relative_path_forwardslash = texture_uuid.relative_path.replace(/\\/g, '/');
			console.log("bp");

		//d	return texture_uuid;	//good

			/// MODIFY PLIST FILE
			let x_dict0 = xmlDoc.getElementsByTagName("dict")[0];
			
			let newEle1 =  xmlDoc.createElement("key");
			let newText1 = xmlDoc.createTextNode("textureFileName");
			newEle1.appendChild(newText1);
			x_dict0.appendChild(newEle1);
			
			let newEle2 =  xmlDoc.createElement("string");
		//	let newText2 = xmlDoc.createTextNode("texture/path/xxx.png");
		//	let newText2 = xmlDoc.createTextNode(spriteFrameUuidNode.nextElementSibling.innerText);
			let newText2 = xmlDoc.createTextNode(relative_path_forwardslash);
			newEle2.appendChild(newText2);
			x_dict0.appendChild(newEle2);
			
			let oSerializer = new XMLSerializer();
			let sXML = oSerializer.serializeToString(xmlDoc);
			let vkb_sXML = vkbeautify.xml(sXML, 4);
			// return sXML;
			return vkb_sXML;
		}

		return null;
	}

	_copyResources(copyReourceInfos) {
		// should copy these resources
		// - all .ccreator files
		// - resources in assets and folder
		// - all files in reader
		// - lua binding codes(currently is missing)
		let projectRoot = this._state.path;
		
		// root path of resources
		let resdst;
		let classes;
		let isLuaProject = Utils.isLuaProject(projectRoot);
		if (isLuaProject) {
			resdst = Path.join(projectRoot, 'res');

			classes = Path.join(projectRoot, 'frameworks/runtime-src/Classes');
			if (!Fs.existsSync(classes))
				classes = Path.join(projectRoot, 'project/Classes'); // cocos2d-x internal lua tests
		} 
		else {
			resdst = Path.join(projectRoot, 'Resources');
			classes = Path.join(projectRoot, 'Classes');
		}

		// copy resources
		{
			// copy .ccreator
			resdst = Path.join(resdst, Constants.RESOURCE_FOLDER_NAME);
			Del.sync(resdst, {force: true});
			this._copyTo(Constants.CCREATOR_PATH, resdst, ['.ccreator'], true);

			// copy other resources
			Object.keys(copyReourceInfos).forEach(function(uuid) {

			//	if (uuid.includes("-atlasText")) {	//leon
			//		console.log("uuid includes -atlasText, skipped: " + uuid);
			//	}
			//	else {
					let pathInfo = copyReourceInfos[uuid];
					let src = pathInfo.fullpath;
					let dst = Path.join(resdst, pathInfo.relative_path);
					Fs.ensureDirSync(Path.dirname(dst));
					Fs.copySync(src, dst);
			//	}
			});
		}

		let state = Editor.remote.Profile.load(plugin_profile, Constants.PROFILE_DEFAULTS);
		if (state.data.exportResourceOnly)
			return;

		// copy reader
		{
			let codeFilesDist = Path.join(classes, 'reader')
			Del.sync(codeFilesDist, {force: true});
			Fs.copySync(Constants.READER_PATH, codeFilesDist);

			// should exclude binding codes for c++ project
			if (!isLuaProject)
			{
				let bindingCodesPath = Path.join(classes, 'reader/lua-bindings');
				Del.sync(bindingCodesPath, {force: true});
			}
		}
	}

   // copy all files with ext in src to dst
   // @exts array of ext, such as ['.json', '.ccreator']
   // @recursive whether recursively to copy the subfolder
	_copyTo(src, dst, exts, recursive) {
		let files = this._getFilesWithExt(src, exts, recursive);

		let dstpath;
		let subpath;
		files.forEach((f) => {
			subpath = f.slice(src.length, f.length);
			dstpath = Path.join(dst, subpath);
			Fs.ensureDirSync(Path.dirname(dstpath));
			Fs.copySync(f, dstpath);
		});
	}

	// get all .fire file in assets folder
	_getFireList() {
		return this._getFilesWithExt(Constants.ASSETS_PATH, ['.fire'], true);
	}

	_getJsonList() {
		return this._getFilesWithExt(Constants.JSON_PATH, ['.json'], true);
	}

   // return file list ends with `exts` in dir
	_getFilesWithExt(dir, exts, recursive) {
		let foundFiles = [];

		const files = Fs.readdirSync(dir);
		files.forEach((f) => {
			let fullpath = Path.join(dir, f)
			let ext = Path.extname(f);
			if (exts.includes(ext))
				foundFiles.push(fullpath);

			if (recursive) {
				let stats = Fs.lstatSync(fullpath);
				if (stats.isDirectory()) 
					foundFiles = foundFiles.concat(this._getFilesWithExt(fullpath, exts, recursive));
			}
		});
		return foundFiles;
	}

	// dynamically load resources located at assets/resources folder
	_getDynamicLoadRes(uuidmap, collectedResources) {
		let state = Editor.remote.Profile.load(plugin_profile, Constants.PROFILE_DEFAULTS);
		if (!state.data.exportResourceDynamicallyLoaded)
			return;
		
		let dynamicLoadRes = {};
		let resourcesPath = Path.join(Constants.ASSETS_PATH, 'resources');

		Object.keys(uuidmap).forEach(function(uuid) {
			if(uuidmap[uuid].indexOf(resourcesPath) < 0)
				return true;
			
			dynamicLoadRes[uuid] = parse_utils.get_relative_full_path_by_uuid(uuid);
		});

		return dynamicLoadRes;
	}
}

registerWorker(BuildWorker, 'run-build-worker');
