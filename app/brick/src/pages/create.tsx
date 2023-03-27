import { CreateApp } from "@/components/pages/CreateApp";
import { CreateToken } from "@/components/pages/CreateToken";
import { Connection } from "@solana/web3.js";
import dynamic from "next/dynamic";

const CreateTokenPage = () => {
    const connection = new Connection(process.env.RPC, "confirmed")    
    return (
        <div className='container'>
            <div className="create">
                <div className="row">
                    <CreateApp connection={connection}/>
                </div>
                <div className="row">
                    <CreateToken connection={connection}/>
                </div>
            </div>
        </div>
    )
};

export default dynamic (() => Promise.resolve(CreateTokenPage), {ssr: false})