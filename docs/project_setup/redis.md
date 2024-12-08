# Redis Setup

## Redis Server Install

Follow [Redis Doc](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) to

1. download redis for your own OS
2. start server
    - `redis-server` for mac/linux
        - need to set PATH (When using brew, it will tell you that what commands need to be run after install)
    - `redis-server.exe` for window
        - need to cd the path redis install

## Use redis client to test

1. open another terminal
2. run `redis-cli`
3. If `127.0.0.1:6379>` appears, the install success
