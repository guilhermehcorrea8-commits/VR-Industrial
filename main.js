import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- CONFIGURAÇÃO INICIAL ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
scene.fog = new THREE.Fog(0x222222, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

renderer.xr.enabled = true;
document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));

// --- ILUMINAÇÃO ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// --- TEXTURA DE TIJOLO PROCEDURAL ---
function createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Cor de fundo (argamassa)
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, 512, 512);
    
    // Desenhar tijolos
    ctx.fillStyle = '#8b3a3a'; // Cor do tijolo
    const brickWidth = 100;
    const brickHeight = 40;
    const gap = 5;
    
    for (let y = 0; y < 512; y += brickHeight + gap) {
        const offset = (Math.floor(y / (brickHeight + gap)) % 2) * (brickWidth / 2);
        for (let x = -brickWidth; x < 512; x += brickWidth + gap) {
            ctx.fillRect(x + offset, y, brickWidth, brickHeight);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2); // Repetir a textura
    return texture;
}

// --- CONSTRUÇÃO DO CENÁRIO ---
const matPiso = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const matParede = new THREE.MeshStandardMaterial({ map: createBrickTexture(), roughness: 0.9 });
const matMetalAzul = new THREE.MeshStandardMaterial({ color: 0x1a3b5c, roughness: 0.4, metalness: 0.6 });
const matMetalBranco = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
const matVermelho = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 });
const matAmarelo = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });

// Piso
const floorGeo = new THREE.PlaneGeometry(40, 40);
const floor = new THREE.Mesh(floorGeo, matPiso);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Paredes
const roomGeo = new THREE.BoxGeometry(40, 10, 40);
const room = new THREE.Mesh(roomGeo, new THREE.MeshStandardMaterial({ map: createBrickTexture(), side: THREE.BackSide }));
room.position.y = 5;
scene.add(room);

// --- FUNÇÃO PARA CRIAR MÁQUINAS ---
function createDrillPress(x, z) {
    const machine = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), matMetalAzul);
    base.position.y = 0.1;
    machine.add(base);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3), matMetalBranco);
    column.position.y = 1.7;
    machine.add(column);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1), matMetalAzul);
    head.position.set(0, 2.8, 0);
    machine.add(head);

    const table = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), matMetalBranco);
    table.position.set(0, 1.5, 0);
    machine.add(table);

    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), matVermelho);
    lever.rotation.z = Math.PI / 4;
    lever.position.set(0.6, 2.5, 0.2);
    machine.add(lever);

    machine.position.set(x, 0, z);
    machine.castShadow = true;
    machine.receiveShadow = true;
    scene.add(machine);
}

createDrillPress(-5, -5);
createDrillPress(0, -8);
createDrillPress(5, -5);

// Armário de Inflamáveis
const cabinetGeo = new THREE.BoxGeometry(2, 3, 1);
const cabinet = new THREE.Mesh(cabinetGeo, matVermelho);
cabinet.position.set(-15, 1.5, 0);
cabinet.castShadow = true;
scene.add(cabinet);

const hazardStripe = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.3), matAmarelo);
hazardStripe.position.set(-15, 2, 0.51);
scene.add(hazardStripe);

// Bancadas
function createBench(x, z) {
    const bench = new THREE.Group();
    const structure = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), matMetalAzul);
    structure.position.y = 0.5;
    bench.add(structure);
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.1, 2.1), matMetalBranco);
    top.position.y = 1.05;
    bench.add(top);
    bench.position.set(x, 0, z);
    scene.add(bench);
}
createBench(10, 5);
createBench(10, 0);

// --- CONTROLES DE MOVIMENTAÇÃO ---
let controls = new PointerLockControls(camera, document.body);

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('instructions').style.display = 'none';
    controls.lock();
});

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

// --- LÓGICA DE MISSÕES ---
const raycaster = new THREE.Raycaster();
let score = 0;
let currentMission = 0;

const missions = [
    { title: "Missão 1: Segurança", desc: "Clique no Armário de Inflamáveis (vermelho)." },
    { title: "Missão 2: Operação", desc: "Clique na alavanca vermelha da Furadeira." },
    { title: "Missão 3: Organização", desc: "Clique na Bancada para organizar." }
];

function onSelect() {
    if (renderer.xr.isPresenting) {
        const controller = renderer.xr.getController(0);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
    } else {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        
        if (currentMission === 0 && clickedObject === cabinet) {
            completeMission();
        } 
        else if (currentMission === 1 && clickedObject.material === matVermelho && clickedObject.geometry.type === 'CylinderGeometry') {
            completeMission();
        }
        else if (currentMission === 2 && clickedObject.material === matMetalBranco && clickedObject.geometry.type === 'BoxGeometry' && clickedObject.parent.children.length > 1) {
            completeMission();
        }
    }
}

const controller0 = renderer.xr.getController(0);
controller0.addEventListener('selectstart', onSelect);
scene.add(controller0);

document.addEventListener('mousedown', () => {
    if (!renderer.xr.isPresenting && controls.isLocked) onSelect();
});

function completeMission() {
    score += 100;
    document.getElementById('score').innerText = score;
    currentMission++;
    
    if (currentMission < missions.length) {
        document.getElementById('mission-title').innerText = missions[currentMission].title;
        document.getElementById('mission-desc').innerText = missions[currentMission].desc;
    } else {
        document.getElementById('mission-title').innerText = "Treinamento Concluído!";
        document.getElementById('mission-desc').innerText = "Você finalizou todas as missões com sucesso.";
    }
}

// --- LOOP DE ANIMAÇÃO ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    }

    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});