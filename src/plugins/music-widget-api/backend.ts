import http from 'node:http';

import { ipcMain } from 'electron';
import is from "electron-is";
import { createBackend } from '@/utils';

import registerCallback from '../../providers/song-info';
import { isEnabled } from '../../config/plugins';

const port = 9863; // Choose a port number

export interface PlayerInfo {
  hasSong: boolean;
  isPaused: boolean;
  volumePercent: number;
  seekbarCurrentPosition: number;
  seekbarCurrentPositionHuman: string;
  statePercent: number;
  likeStatus: string;
  repeatType: string;
}

export interface TrackInfo {
  author: string;
  title: string;
  album: string;
  cover: string;
  duration: number;
  durationHuman: string;
  url: string;
  id: string;
  isVideo: boolean;
  isAdvertisement: boolean;
  inLibrary: boolean;
}

export interface YTMDSongInfo {
  player: PlayerInfo;
  track: TrackInfo;
}

let songInfo: (YTMDSongInfo & { loopStatus?: string, volume?: number });

export default createBackend({
  start({ipc: { send } }) {
    songInfo = {
      player: {
        hasSong: false,
        isPaused: false,
        volumePercent: 100,
        seekbarCurrentPosition: 0,
        seekbarCurrentPositionHuman: '0:00',
        statePercent: 0,
        likeStatus: "INDIFFERENT",
        repeatType: "NONE",
      },
      track: {
        duration: 0,
        durationHuman: "0:00",
        title: "",
        author: "",
        album: "",
        cover: "",
        url: "",
        id: "",
        isVideo: false,
        isAdvertisement: false,
        inLibrary: false,
      }
    };

    if (!is.linux() || (is.linux() && !isEnabled('shortcuts'))) {
      ipcMain.on('ytmd:player-api-loaded', () => {
        send('ytmd:setup-seeked-listener', 'music-widget-api');
        send('ytmd:setup-time-changed-listener', 'music-widget-api');
        send('ytmd:setup-repeat-changed-listener', 'music-widget-api');
        send('ytmd:setup-volume-changed-listener', 'music-widget-api');
      });
    }

    // updations
    ipcMain.on('ytmd:seeked', (_: any, t: number) => {
      if (songInfo) {
        songInfo.player.seekbarCurrentPosition = t;
        songInfo.player.statePercent = t / songInfo.track.duration;
      }
    });

    ipcMain.on('ytmd:time-changed', (_: any, t: number) => {
      if (songInfo) {
        songInfo.player.seekbarCurrentPosition = t;
        songInfo.player.statePercent = t / songInfo.track.duration;
      }
    });

    ipcMain.on('ytmd:repeat-changed', (_: any, mode: string) => {
      if (songInfo) {
        songInfo.loopStatus = mode;
      }
    });

    ipcMain.on('ytmd:volume-changed', (_: any, newVolume: number) => {
      if (songInfo) {
        songInfo.volume = newVolume;
      }
    });

    registerCallback((info) => {
      // Nothing here is even used except things like hasSong, isPaused, and track metadata related
      songInfo = {
        player: {
          hasSong: info.artist && info.title ? true : false,
          isPaused: info.isPaused ?? false,
          volumePercent: songInfo?.volume ?? 100,
          seekbarCurrentPosition: songInfo.player.seekbarCurrentPosition,
          seekbarCurrentPositionHuman: songInfo?.player.seekbarCurrentPositionHuman ?? '00:00',
          statePercent: songInfo?.player.statePercent ?? 0,
          likeStatus: "INDIFFERENT",
          repeatType: "NONE",
        },
        track: {
          duration: info.songDuration,
          durationHuman: "", // doesnt matter, calculated using duration anyways
          title: info.title,
          author: info.artist,
          album: info.album ?? "",
          cover: info.imageSrc ?? "",
          url: info.url ?? "",
          id: new URL(info.url ?? "").searchParams.get("v") ?? "",
          isVideo: info.videoId !== undefined,
          isAdvertisement: false,
          inLibrary: false,
        }
      }
      return songInfo;
    });

    const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      // necessary because of CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/') {
        res.writeHead(200)
        res.end("Music Widget API is running.")
      }
      if (req.url === '/query' || req.url === '/api') {
        res.end(JSON.stringify(songInfo));
      }
    });
    server.listen(port, () => {
      console.log(`Music widget api started at http://localhost:${port}`);
    });
  }
});
