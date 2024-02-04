import { DebugTilesRenderer as TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
	FogExp2,
	Vector3,
	Box3,
	Box3Helper
} from 'three';
import { FlyOrbitControls } from './src/controls/FlyOrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer;
let groundTiles;
let firstRender = true;

const box = new Box3();

const params = {
	errorTarget: 12,
	displayBoxBounds: false,
	fog: false,
};

init();
render();

function fitCameraToBox( camera, controls, box, fitOffset = 0.5 ) {

	const size = new Vector3();
	const center = new Vector3();

	box.getSize( size );
	box.getCenter( center );

	console.log( 'size', size, 'center', center );

	const maxSize = Math.max( size.x, size.y, size.z );
	const fitHeightDistance = maxSize / ( 2 * Math.atan( ( Math.PI * camera.fov ) / 360 ) );
	const fitWidthDistance = fitHeightDistance / camera.aspect;
	const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );

	const direction = controls.target
		.clone()
		.sub( camera.position )
		.normalize()
		.multiplyScalar( distance );

	controls.maxDistance = distance * 10;
	controls.target.copy( center );

	camera.near = distance / 100;
	camera.far = distance * 100;
	camera.updateProjectionMatrix();

	camera.position.copy( controls.target ).sub( direction );

	controls.update();

}

function init() {

	const fog = new FogExp2( 0xd8cec0, 0.0075, 250 );
	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 0, 100, 100 );

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;
	controls.maxAzimuthAngle = Math.PI / 2;
	controls.baseSpeed = 0.1;
	controls.fastSpeed = 0.2;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	// TODO: 축 방향 체크
	// tilesParent.rotation.set( - Math.PI / 1.4, 0, 0 );
	tilesParent.rotateX( - Math.PI / 5 );
	tilesParent.rotateZ( - Math.PI / 5 );
	scene.add( tilesParent );

	// groundTiles = new TilesRenderer( '../TilesetWithDiscreteLOD/tileset.json' );
	groundTiles = new TilesRenderer( '../Scene/tileset.json' );
	groundTiles.fetchOptions.mode = 'cors';
	// groundTiles.group.add( new AxesHelper( 100000 ) );

	tilesParent.add( groundTiles.group );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'fog' ).onChange( ( v ) => {

		scene.fog = v ? fog : null;

	} );

	gui.add( params, 'displayBoxBounds' );
	gui.add( params, 'errorTarget', 0, 100 );
	gui.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function render() {

	requestAnimationFrame( render );

	camera.updateMatrixWorld();

	groundTiles.errorTarget = params.errorTarget;
	groundTiles.displayBoxBounds = params.displayBoxBounds;

	if ( firstRender ) {

		groundTiles.getBounds( box );
		box.applyMatrix4( groundTiles.group.matrixWorld );
		if ( box.max.x !== - Infinity && box.min.x !== Infinity ) {

			fitCameraToBox( camera, controls, box );
			const boxHelper = new Box3Helper( box, 0xffff00 );
			scene.add( boxHelper );
			firstRender = false;

		}

	}

	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.update();

	renderer.render( scene, camera );

}
