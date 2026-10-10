#!/bin/bash
# The FR3's links and its Franka Hand measured from Franka Robotics' franka_description (Apache-2.0) collision meshes,
# each in its own frame, split where Franka's visual model changes colour (its base's foot and dark top, its elbow's dark
# caps, its forearm's dark strut): writes src/nexus/models/fr3.ts.
#   DESC=<a clone of github.com/frankaemika/franka_description> PY=<a python 3> tools/measure/fr3_ts.sh
set -euo pipefail
DESC=${DESC:-/home/user/frankaemika/franka_description}; PY=${PY:-python3}
D=$DESC/meshes/robots/fr3/collision; H=$DESC/meshes/robot_ee/franka_hand_white/collision
cd "$(dirname "$0")/../.." && $PY -I tools/measure/meshloft.py ts FR3_LINKS src/nexus/models/fr3.ts "Franka Robotics' franka_description (Apache-2.0), robots/fr3 and robot_ee/franka_hand_white collision meshes, each in its own frame" \
  "link0 foot=$D/link0.stl:z:x:z<12" "link0=$D/link0.stl:z:x:z>12,z<105" "link0 top=$D/link0.stl:z:x:z>105" "link1=$D/link1.stl:z:y" "link2=$D/link2.stl:y:z" \
  "link3=$D/link3.stl:z:x:y<61" "link3 cap=$D/link3.stl:y:x:y>61" "link4=$D/link4.stl:x:y:z<61" "link4 cap=$D/link4.stl:z:x:z>61" \
  "link5=$D/link5.stl:z:y:y<77" "link5 strut=$D/link5.stl:z:y:y>77" "link6=$D/link6.stl:x:y" "hand=$H/hand.stl:y:z:z>-14.5" --scale 1000
