
import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite 
{

    constructor(scene, x, y) {
        super(scene, x, y, 'idle_pelirroja', 0);
        this.scene.physics.add.existing(this); //Escena física
        this.scene.add.existing(this) // lo meto en la la lógica
        this.scene.input.on('pointerdown', this.onClick, this);
        this.body.setAllowGravity(false);
        /// Deficinión de parametros
        this.velocity = 400.0;
        this.stopDistance = 5.0;
        this.usingNavmesh = true;
        this.navMesh = null;
        this.currentTarget = null;
        //Variables internas
        this._isMoving = false;
        this._targetX = this.x;
        this._targetY = this.y;
        this._enableInput = true;
        this.bored = true; // El jugador se aburre si está sin hacer nada/quieto, asñi que puede acceder a interactuar con la mesa si está en la posición correcta
        this.play("idle_pelirroja");
        this._animationState = "idle_pelirroja";

    }


    preUpdate(t, dt) {
        super.preUpdate(t, dt);
        if(this.usingNavmesh && this.navMesh != null)
        {
            this.moveUsingPathfinding(t,dt);
        }
        else
        {
            this.checkStop(t,dt);
        }
        this.animationController();
        //this.move(dt);
        // if (this.cursors.up.isDown && this.body.onFloor()) {
        //     this.body.setVelocityY(this.jumpSpeed);
        // }
        // if (this.cursors.left.isDown) {
        //     this.body.setVelocityX(-this.speed);
        // }
        // else if (this.cursors.right.isDown) {
        //     this.body.setVelocityX(this.speed);
        // }
        // else {
        //     this.body.setVelocityX(0);
        // }
    }


    /// Función que se invoca desde el evento pointdown
    ///pointer: el puntero del mouse.
    onClick(pointer, gameObject)
    {
        if(this._enableInput)
        {
            console.log('down X '+pointer.downX + " Y "+pointer.downY);
            this.bored = true;
            this._targetX = pointer.downX;
            this._targetY = pointer.downY;
            let destination = new Phaser.Math.Vector2(this._targetX,this._targetY);
            if(this.usingNavmesh && this.navMesh != null)
            {
                this.goTo(destination,gameObject);
            }
            else
            {
                this.movePosition(destination);
            }
            
        }
    }

    /// Permite cambiar entre movimiento usando el navmesh o movimiento lineal.
    setUsingNavmesh(b)
    {
        this.usingNavmesh = b;
    }

    // en movimiento lineal, detecta cuando hay que parar (cuando llega al ponto establecido)
    checkStop(t,dt)
    {
        let xTarget = new Phaser.Math.Vector2(this._targetX,this._targetY);
        let pos = new Phaser.Math.Vector2(this.x,this.y);
        let direction = xTarget.subtract(pos);
        let mod = direction.length();
        //console.log(" mod "+mod + " velocityX "+this.body.velocity.x + " y " +this.body.velocity.y);
        if(mod < this.stopDistance)
        {
            this.body.setVelocityX(0);
            this.body.setVelocityY(0);
        }
    }

    ///Setea el navmesh desde la escena
    setNavmesh(navmesh)
    {
        this.navMesh = navmesh;
    }

    //Establece el punto al que tengo que ir usando el pathfinding y creo el path.
    goTo(targetPoint,gameObject) 
    {
        if(this.navMesh == null)
            this.currentTarget = null;
        else
        {
            // Find a path to the target
            this.path = this.navMesh.findPath(new Phaser.Math.Vector2(this.x, this.y), targetPoint);
        
            // If there is a valid path, grab the first point from the path and set it as the target
            if (this.path && this.path.length > 0)
            {
                this.body.setVelocityX(0);
                this.body.setVelocityY(0);
                this.currentTarget = this.path.shift();
            }
            else if(gameObject && gameObject.length > 0 &&  gameObject[0].type == "Zone")
            {
                this.currentTarget = null;

                this.currentTarget = null;
                const zone = gameObject[0];
                const yPosition = zone.y - zone.height;

                this.path = this.navMesh.findPath(new Phaser.Math.Vector2(this.x, this.y), new Phaser.Math.Vector2(zone.x, yPosition));
                if (this.path && this.path.length > 0) 
                    this.currentTarget = this.path.shift();
                else
                    this.currentTarget = null;
            }
            else if(this.path == null)
            {
                this.body.setVelocityX(0);
                this.body.setVelocityY(0);
                this.currentTarget = null;
            }
        }
    }

    setEnableInput(enable)
    {
        this._enableInput = enable;
    }

    isEnable()
    {
        return this._enableInput;
    }

    isBored(){
        return this.bored
    }

    setBored(bored){
        this.bored = bored;
    }

    isStanding(){
        return this.body.velocity.x == 0 && this.body.velocity.y == 0;
    }

    //Establece la velocidad de movimiento del player hacia el punto de destino
    //Este método funciona tanto en el modo pathfinding como en el modo en linea recta
    movePosition(destination)
    {
        let pos = new Phaser.Math.Vector2(this.x,this.y);
        let direction = destination.subtract(pos);
        let mod = direction.length();
        direction = direction.normalize();
        
        if(mod > this.stopDistance)
        {
            this.body.setVelocityX(this.velocity*direction.x);
            this.body.setVelocityY(this.velocity*direction.y);
        }
    }

    //se llama desde el preUpdate (de ahi los parámetros aunque no los necesita por ahora)
    //Controla los diferentes estados del movimiento con pathfinding: hemos llegado al final o hemos cambiado de tramo de la ruta
    //El estado de moviendose en un tramo lo realiza el motor Arcade de phaser.
    moveUsingPathfinding(t,dt)
    {
        if (this.currentTarget) 
        {
            const { x, y } = this.currentTarget;
            const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);
            let changeTarget = false;
            if (distance < this.stopDistance && this.path.length > 0) 
            {
                // obtengo el path siguiente.
                this.currentTarget = this.path.shift();
                changeTarget = true;
            }
            else if((distance < this.stopDistance) && (this.path.length == 0))
            {
                this.body.setVelocityX(0);
                this.body.setVelocityY(0);
                this.currentTarget = null;
            }

            if(changeTarget)
            {
                this.movePosition(new Phaser.Math.Vector2(this.currentTarget.x,this.currentTarget.y));
            }
                

        }
    }

    animationController()
    {
        if(this._animationState == "idle_pelirroja")
        {
            if(this.isMoving())
            {
                this._animationState=this.changeAnimation();
                this.play(this._animationState);
            }
        }
        else{
            const newState = this.changeAnimation();
            if(newState != this._animationState)
            {
                this._animationState = newState;
                this.play(this._animationState);
            }
        }
    }

    changeAnimation()
    {
        if(this.isMovingLeft())
        {
            return "move_left_pelirroja";
        }
        else if(this.isMovingRight())
        {
            return "move_right_pelirroja";
        }
        else if(this.isMovingUp())
        {
            return "move_up_pelirroja";
        }
        else if(this.isMovingDown())
        {
            return "move_down_pelirroja";
        }
        else
        {
            return "idle_pelirroja";
        }
    }

    isMovingLeft()
    {
        if(Math.abs(this.body.velocity.x) > Math.abs(this.body.velocity.y)) // nos movemos izquierda/derecha
        {
            return this.body.velocity.x < 0.0;
        }
        return false;
    }

    isMovingRight()
    {
        if(Math.abs(this.body.velocity.x) > Math.abs(this.body.velocity.y)) // nos movemos izquierda/derecha
        {
            return this.body.velocity.x > 0.0;
        }
        return false;
    }

    isMovingUp()
    {
        if(Math.abs(this.body.velocity.x) < Math.abs(this.body.velocity.y)) // nos movemos izquierda/derecha
        {
            return this.body.velocity.y < 0.0;
        }
        return false;
    }

    isMovingDown()
    {
        if(Math.abs(this.body.velocity.x) < Math.abs(this.body.velocity.y)) // nos movemos izquierda/derecha
        {
            return this.body.velocity.y > 0.0;
        }
        return false;
    }

    isMoving()
    {
        let lenght = Math.abs(this.body.velocity.x) +  Math.abs(this.body.velocity.y);
        return lenght > 1.0; // si nos estamos moviendo
    }

    stopMoving() {
        this.currentTarget = null;
        this.body.setVelocity(0, 0);
        this._isMoving = false;
        this._targetX = this.x;
        this._targetY = this.y;
    }
      
    destroy() 
    {
        if (this.scene) this.scene.events.off("update", this.update, this);
        super.destroy();
    }

}
