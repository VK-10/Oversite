// connecting to sse
//parsing chunks
//emitting updates

//listener

type StreamAgentOptions = {
    apiRoute: string,
    apiData: unknown,

    onChunk?: (chunk: unknown) => void
    onDone?: () => void
    onError?: (error: Error) => void 
}

export async function streamAgent ({
    apiRoute,
    apiData,
    onChunk,
    onDone,
    onError,
} : StreamAgentOptions) {

    try {

        const apiResponse = await fetch(apiRoute, {
            method: "POST",
            headers: {
                "Content-Type" : "application/json",
            },
            body: JSON.stringify(apiData),
        });


        if (!apiResponse.ok) throw new Error("server issue")
        if (!apiResponse.body) throw new Error("No response body");

        const reader = apiResponse.body
                        .pipeThrough(new TextDecoderStream())
                        .getReader();

        let buffer = "";
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            if (value) {
                //do something
                buffer += value;

                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                    const line = part.replace("data: ", "");

                    try {
                        const parsed = JSON.parse(line);
                        onChunk?.(parsed);

                    } catch (error) {
                        console.error(error);
                    }
                }  
    
            }
        onDone?.(); 
    };

    } catch (error) {
        onError?.(error as Error);
    }

}