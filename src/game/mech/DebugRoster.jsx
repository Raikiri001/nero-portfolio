import { Canvas } from '@react-three/fiber';
import { DebugPump } from './debugPump';
import { SceneEnvironment } from '../SceneEnvironment';
import { MechModel3D } from './MechModel3D';
import { getHeroPalette } from './palettes';

const p = new URLSearchParams(window.location.search);
const IDS = (p.get('ids') || '0').split(',').map(Number);
const DIST = parseFloat(p.get('dist') || '3');
const YAW = parseFloat(p.get('yaw') || '0');
const CY = parseFloat(p.get('cy') || '0.68');
const FOV = parseFloat(p.get('fov') || '32');
const DEPLOY = p.has('deploy') ? parseFloat(p.get('deploy')) : null;

export function DebugRoster() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0d12' }}>
      <Canvas
        camera={{ position: [0, CY, DIST], fov: FOV }}
        gl={{ antialias: true }}
        // on demand, so a headless SwiftShader shot costs a handful of
        // frames instead of one per second of virtual time
        frameloop="demand"
        onCreated={({ camera }) => camera.lookAt(0, CY, 0)}
      >
        <DebugPump />
        <SceneEnvironment intensity={1.1} />
        <hemisphereLight args={['#8fa6c8', '#101318', 0.7]} />
        <directionalLight position={[4, 8, 6]} intensity={2.1} />
        <directionalLight position={[-5, 3, -4]} intensity={0.9} color="#7fb0ff" />
        <group rotation={[0, YAW, 0]}>
          {IDS.map((id) => (
            <MechModel3D key={id} gundamId={id}
              palette={getHeroPalette(id)} animate={false} scale={1} wingDeploy={DEPLOY} />
          ))}
        </group>
      </Canvas>
    </div>
  );
}
