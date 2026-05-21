import { useRef } from "react";

export function useAutoScroll(dependencies: inknown[]) {

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        containerRef.current?.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
        })
    })
}