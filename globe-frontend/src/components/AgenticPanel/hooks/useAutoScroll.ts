import { useEffect, useRef } from "react";

export function useAutoScroll(dependencies: unknown[]) {

    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        containerRef.current?.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, dependencies);

    return containerRef;
}