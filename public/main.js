var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
var can_shoot = true;
camera.position.set(0, 0, 5);
var renderer = new THREE.WebGLRenderer({
    antialias: true //makes the cone look better by smoothing it out
});
var enemyMat = new THREE.MeshBasicMaterial( {color: "#FF0000"} );
var socket = io()
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
var coneGeom = new THREE.ConeGeometry(0.125, 1, 4);
coneGeom.translate(0, .5, 0);
coneGeom.rotateX(Math.PI / 2);
var coneMat = new THREE.MeshBasicMaterial( {color: "#34a8eb"} );

var Player = new THREE.Mesh(coneGeom, coneMat);
Player.lookAt(new THREE.Vector3(0, 1, 0));
scene.add(Player);
var grid = new THREE.GridHelper(100, 100, "red", "white");
grid.rotation.x = Math.PI / 2;
scene.add(grid);
window.addEventListener("mousemove", onmousemove, false);
const listener = new THREE.AudioListener();
Player.add(listener);
const sound = new THREE.Audio(listener);
const geometry = new THREE.BoxGeometry();
var geo = new THREE.EdgesGeometry(geometry);

var material = new THREE.LineBasicMaterial({
    color: "#FFFFFF",
    linewidth: 1
});
var enemy = new THREE.LineSegments(geo, material);
var myId;
scene.add(enemy)
enemy.position.set(1, 1, 0)
var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersectPoint = new THREE.Vector3();
var speed = 0.05
var keys = []
var bullets = []
var enemies = []
var shooting;
var isDead = false;
var clock = new THREE.Clock();
var delta = 0;
const movement = function() {
    requestAnimationFrame(movement);
    if (keys[87] && !isDead) {
        Player.translateZ(speed)
    }
    camera.position.lerp(Player.position, 0.1);
    camera.position.z = 10;
}
var material = new THREE.LineBasicMaterial({
    color: "#FFFFFF",
    linewidth: 1
});
var clients = []

function onmousemove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, intersectPoint);
    if (!isDead) {
        Player.lookAt(intersectPoint);
    }
}
const shoot = function() {
    requestAnimationFrame(shoot);
    if (shooting && can_shoot && !isDead) {

        // load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();

        audioLoader.load('assets/audio/pop.mp3', function(buffer) {
            sound.setBuffer(buffer);
            sound.play();
        });
        var bullet_geo = new THREE.SphereGeometry(0.05, 32, 32);
        var bullet = new THREE.Mesh(bullet_geo, material);
        scene.add(bullet)
      
        bullet.position.set(Player.position.x, Player.position.y, Player.position.z)
        bullet.quaternion.copy(Player.quaternion);
        bullets.push(bullet)
        can_shoot = false

        bullet.alive = true;
        setTimeout(function() {
            bullet.alive = false;
        }, 500);
    }

}
shoot()
movement()
render();
document.addEventListener("keydown", key => {
    keys[key.keyCode] = true;
});
document.addEventListener("keyup", key => {
    keys[key.keyCode] = false;
});
document.addEventListener("mousedown", () => {
    shooting = true;
})
document.addEventListener("mouseup", () => {
    shooting = false;
})

setInterval(function() {
    can_shoot = true
}, 500)

function Notify(text) {
    var p = document.createElement("p");
    // p.className='notif'
    var n = document.createTextNode(text);
    p.appendChild(n);
    var element = document.getElementById("notif_board");
    element.appendChild(p);
}

function render() {
    requestAnimationFrame(render);
    delta = clock.getDelta();
    bullets.forEach(bullet => {
        if (!bullet.alive) {
            bullets.splice(bullet, 1)
            scene.remove(bullet)
        } else {
            if (clients.length > 0) {
                clients.forEach(id => {
                    if (id != myId) {
                        let user = scene.getObjectByName(id);
                        let bulletBox = new THREE.Box3().setFromObject(bullet);
                        let enemyBox = new THREE.Box3().setFromObject(user);
                        if (bulletBox.intersectsBox(enemyBox) && id != myId) {
                            bullets.splice(bullet, 1)
                            scene.remove(bullet)
                            socket.emit("send_damage", {
                                idTo: id,
                                idFrom: myId
                            })
                            user.position.set(100, 100, 100)
                            Notify("You Killed " + id)
                            // Yes, I know client side is bad. I'm just to lazy to make a server side implementation lmao
                        }
                    }
                })
            }
            bullet.translateZ(delta * 25);
        }

    })
    renderer.render(scene, camera);
}
socket.on("assign_info", data => {
    myId = data.id
})
socket.on("render_current_players", data => {
    var cc = data.ids
    clients = data.ids
    if (cc.length > 0) {
        cc.forEach(n => {
            let x = new THREE.Mesh(coneGeom, enemyMat);
            x.lookAt(new THREE.Vector3(0, 1, 0));
            scene.add(x);
            x.name = n
        })
    }
})
socket.on("player_connection", data => {
    clients = data.ids
    let client = new THREE.Mesh(coneGeom, enemyMat);
    client.lookAt(new THREE.Vector3(0, 1, 0));
    scene.add(client);
    client.name = data.id
})
socket.on("update_positions", data => {
    clients.forEach(client => {
        if (client === data.id) {
            let user = scene.getObjectByName(data.id)
            user.position.set(data.x, data.y, 0)
            user.rotation.set(data.rotX, data.rotY, 0)
        }
    })
})
socket.on("damage_player", data => {
    Notify("You Were Killed By " + data.idFrom)
    Player.visible = false;
    isDead = true;
    // "No, I'm not lazy!" (placeholder for main menu)
    Player.position.set(100, 100, Math.random()*1000)
    setTimeout(function() {
      var lol = Math.random()*10
      Player.position.set(lol,lol,0)
        Player.visible = true;
        isDead = false;
    }, 5000)
})
socket.on("remove_player", data => {
    let c = scene.getObjectByName(data.id)
    scene.remove(c)
    clients = data.ids
})
setInterval(function() {
    // Check that player is not dead
    if (!isDead) {
        document.getElementById("notif_board").innerHTML = ""
    }
}, 5000)
setInterval(function() {
    socket.emit("send_position", {
        x: Player.position.x,
        y: Player.position.y,
        rotX: Player.rotation.x,
        rotY: Player.rotation.y,
    })
}, 10)