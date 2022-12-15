BUILD_ID=$(npx percy exec -- {test command} | grep build | awk -F "/" '{print $NF}')
npx percy-report generate $BUILD_ID
