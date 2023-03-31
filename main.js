import * as THREE from 'three';
import {CCapture} from 'ccapture.js-npmfixed';
import {Pane} from 'tweakpane';
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
// let OrbitControls = require("three/examples/jsm/controls/OrbitControls").OrbitControls

let paletteLight = [ "#e9ecef", "#dee2e6", "#f8f9fa","#dee2e6", "#e5e5ed"]
// let paletteDark = ['#363636', '#2C2C2C', '#242424','#181818', '#0A0A0A',]
let paletteDark = ['#0A0A0A', '#181818', '#242424','#2C2C2C', '#363636',]

paletteLight = paletteLight.map((color) => new THREE.Color(color))
paletteDark = paletteDark.map((color) => new THREE.Color(color))

let palette = paletteLight

// let palette = [0xf8f9fa, 0xe9ecef, 0xdee2e6, 0xced4da, 0xadb5bd]

export default class Sketch{
    constructor(){
        this.onCapture = false;
        this.container = document.getElementById('container');
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize( this.width, this.height );
        this.renderer.setClearColor(0x111111,1)
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.container.appendChild( this.renderer.domElement );

        this.camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.01, 
            200
        );

        // this.isometricFill();
        // this.camera.position.y = -0.29;
        this.camera.position.z = 0.1;
        this.camera.position.x = 0.1;

        this.scene = new THREE.Scene();
        // this.control = new OrbitControls(this.camera, this.renderer.domElement)
        this.time = 0;
        this.mouse = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSpeed = 0;

        this.addMesh();
        this.settings();
        this.mouseEvent();
        this.resize();
        // this.addPost();
        this.render();
        this.setupResize();

    }
    isometricFill(){
        var frustumSize = 1;
        var aspect = this.width/this.height;
        this.camera = new THREE.OrthographicCamera(
            frustumSize / -2,
            frustumSize / 2,
            frustumSize / 2,
            frustumSize / -2,
            -1000,
            1000 
        );
    }

    settings(){
        this.pane = new Pane();
        this.PARAMS = {
            progress: 0,
            dark: false,
        };
        // this.pane.addInput(
        //     this.PARAMS, 'progress',
        //     {min: 0, max: 1}
        // ).on('change', (ev)=>{
        //     this.material.uniforms.uProgress.value = ev.value;
        // })
        this.pane.addInput(
            this.PARAMS, 'dark',
        ).on('change', (ev)=>{
            console.log('change to Dark')
            if (this.PARAMS.dark) this.material.uniforms.uColor.value = paletteDark;
            else this.material.uniforms.uColor.value = paletteLight;
        })

        this.PARAMS_CAMERA = {
            x: 0.52,
            y: 0.03,
            z: 0.4
        }
        const cameraFolder = this.pane.addFolder({
            title: 'Record',
            expanded: true,
        });
        cameraFolder.addInput(this.PARAMS_CAMERA, 'x',{min: -5, max: 5, step:0.01})
        cameraFolder.addInput(this.PARAMS_CAMERA, 'y',{min: -5, max: 5, step:0.01})
        cameraFolder.addInput(this.PARAMS_CAMERA, 'z',{min: -5, max: 5, step:0.01})

        this.PARAMS_EXPORT = {
            frameRate: 25,
            format: 'png',
        }
        const recordFolder = this.pane.addFolder({
            title: 'Record',
            expanded: true,
        });
        recordFolder.addInput(this.PARAMS_EXPORT, 'frameRate',{min: 10, max: 60, step:1});
        recordFolder.addInput(this.PARAMS_EXPORT, 'format',{
            options: {
                Imgs: 'png',
                Video: 'webm',
                // Gif: 'gif'
            }
        });
        recordFolder.addSeparator();
        const btnStart = recordFolder.addButton({title: 'Start Recording'})
        
        const btnStop = recordFolder.addButton({title: 'Stop Recording', disabled: true})
        
        btnStop.on('click', (ev)=>{
            if (this.capturer){
                this.capturer.stop();
                this.onCapture = false;
                this.capturer.save();
            }
            btnStart.disabled = false;
        })
        btnStart.on('click', (ev)=>{
            this.addCapture();
            btnStop.disabled = false;
            btnStart.disabled = true;
        })

    }

    addCapture(){
        this.capturer = new CCapture({
            framerate: this.PARAMS_EXPORT.frameRate,
            verbose: false,
            format: this.PARAMS_EXPORT.format,
            // display: true,
            autoSaveTime: 0,
            timeLimit: 4,
            frameLimit: 0,
            quality: 99,
            workersPath: './lib/',
        })
        this.capturer.start();
        this.onCapture = true;
        
    }

    mouseEvent(){
        let lastX = 0, lastY = 0;
        this.mouseSpeed = 0;
        document.addEventListener('mousemove', (e)=>{
            this.mouseSpeed = e.pageX - e.pageY;
            // this.mouseSpeed = .05*Math.sqrt((e.pageX - lastX)**2 + (e.pageY - lastY)**2)
            this.mouseX = (e.pageX-this.width/2)*.001;
            this.mouseY = (e.pageY-this.height/2)*.001;
            lastX = e.pageX;
            lastY = e.pageY;
            // mousemove
        })
    }

    addPost(){

    }

    addMesh(){
        this.geometry = new THREE.PlaneGeometry(2,2, 1000, 1000);

        this.material = new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,
            
            uniforms: {
                uMouse: {value: 0},
                uResolution: {value: new THREE.Vector2()},
                uProgress: {value: 0},
                uImg: {value: this.texture},
                uTime: {value: 0},
                uColor: {value: palette},
                uMouseSpeed: {value: this.mouseSpeed}
                // uSize: {value: 6.0},
                // uScale: {value: 0}
            },
            // side: THREE.DoubleSide,
            // transparent: true,
            // wireframe: true,
        })
        
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.scene.add( this.mesh );
    }

    setupResize(){
        window.addEventListener("resize", this.resize.bind(this));
    }

    resize(){
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);

        this.material.uniforms.uResolution.value.x = this.width;
        this.material.uniforms.uResolution.value.y = this.height;
    }

    render(){
        this.time++;
        this.camera.position.x = this.PARAMS_CAMERA.x;
        this.camera.position.y = this.PARAMS_CAMERA.y;
        this.camera.position.z = this.PARAMS_CAMERA.z;
        
        this.scene.rotation.z = -9;
	    // this.scene.rotation.y = this.time / 1000;
        this.material.uniforms.uTime.value = this.time*0.001;
        this.material.uniforms.uMouseSpeed.value = this.mouseSpeed;
        // this.control.update();
        this.renderer.render( this.scene, this.camera );
        console.log(this.mouseSpeed)
        window.requestAnimationFrame(this.render.bind(this))
        if (this.onCapture) this.capturer.capture(this.renderer.domElement);
    }
}

new Sketch();