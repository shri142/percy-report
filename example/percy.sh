BUILD_ID=$(npx percy snapshot ./example/snapshots.json | grep build | awk -F "/" '{print $NF}')
npx percy-report generate $BUILD_ID
