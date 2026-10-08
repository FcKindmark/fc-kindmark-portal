import {replyLabel} from "../lib/matches";
export default function ReplyStatus({value,called=true}){
 const state=!called?"uncalled":value===true?"yes":value===false?"no":"waiting";
 return <span className={`reply-status reply-${state}`}>{called?replyLabel(value):"Ej kallad"}</span>;
}
