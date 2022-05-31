function Parser(json){
    json = JSON.parse(json)
    this.data = json.data
    this.included = json.included
    
}

Parser.prototype.getSimplified = function(){
    return this.data.map((item)=>{
        if(item.relationships){
            item.relationships = this.resolveRelationships(item.relationships)
        }
        return item
    })
}

Parser.prototype.resolveData = function(data){
    if(!data) return;
    let item = this.included.find((item)=>item.type == data.type && item.id == data.id)
    if(!item)return
    if(item.relationships){
        item.relationships = this.resolveRelationships(item.relationships)
    }
    return item
}

Parser.prototype.resolveRelationships= function(relationships){
    for(let key in relationships){
        let relationship = relationships[key]
        if(!relationship)continue;
        if(Object.prototype.toString.call(relationship.data) == '[object Object]'){
            if(relationship.data){
                relationships[key] = this.resolveData(relationship.data)
            }
        }else if(Object.prototype.toString.call(relationship.data) == '[object Array]'){
            relationship.data.forEach((item,i)=>{
                relationships[key].data[i] = this.resolveData(relationship.data[i])
            })
        }
    }
    return relationships
}

module.exports.Parser = Parser