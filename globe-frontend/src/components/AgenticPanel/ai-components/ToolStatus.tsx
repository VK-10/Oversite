
interface ToolStatusProps {
    status: string;
}

const ToolStatus = ({
    status, 
}: ToolStatusProps) => {
    return (
        <div className="tool-status">
            <p>{status}</p>
        </div>
    )
}

export default ToolStatus;