#!/bin/bash
BASEDIR=$(dirname $0)
urxvt -title wmtag_1 -e $EDITOR $BASEDIR/client/pix.js &
urxvt -title wmtag_1 -e $EDITOR $BASEDIR/client/socket.js &
urxvt -title wmtag_2 -e $EDITOR $BASEDIR/server/game.js &
urxvt -title wmtag_2 -e $EDITOR $BASEDIR/server/socket.js &
urxvt -e $BASEDIR/node.sh &
clear
http-server $BASEDIR/client -p 11155
clear



