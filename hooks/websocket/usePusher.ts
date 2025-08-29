"use client";
import { pusherClient } from "@/lib/websocket/pusher";
import { useEffect, useRef } from "react";

export function usePusher<T = any>(
  channelName: string,
  eventName: string,
  callback: (data: T) => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const channel = pusherClient.subscribe(channelName);

    const eventHandler = (data: T) => {
      callbackRef.current(data);
    };

    channel.bind(eventName, eventHandler);

    return () => {
      channel.unbind(eventName, eventHandler);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, eventName]);
}
