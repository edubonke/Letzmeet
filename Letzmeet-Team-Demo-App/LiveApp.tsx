import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, Pressable, View, StyleSheet } from 'react-native';

/* SANDBOX ONLY: synthetic accounts and health information. Do not connect real users. */
type Session = { token: string; userId: string };
type Profile = { id:string; displayName:string; bio:string; metro:string; relationshipIntent:string };
type Match = { id:string; otherUserId:string; otherDisplayName:string };
type Message = { id:string; text:string; senderId:string; sentAt:string };
const BASE=process.env.EXPO_PUBLIC_LETZMEET_API_URL || 'http://10.0.2.2:4181';
const SAFE=/^https:\/\//i.test(BASE)||/^http:\/\/(10\.0\.2\.2|127\.0\.0\.1|localhost):4181\/?$/i.test(BASE);
function Button({label,press}:{label:string;press:()=>void}) {return <Pressable accessibilityRole="button" onPress={press} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>;}
function Field({label,value,set,secret=false}:{label:string;value:string;set:(v:string)=>void;secret?:boolean}) {return <View style={{marginBottom:10}}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.field} value={value} onChangeText={set} secureTextEntry={secret} autoCapitalize="none"/></View>;}
export default function LiveApp() {
  const [session,setSession]=useState<Session|null>(null);
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [name,setName]=useState(''),[bio,setBio]=useState(''),[intent,setIntent]=useState('Friendship');
  const [profiles,setProfiles]=useState<Profile[]>([]),[matches,setMatches]=useState<Match[]>([]);
  const [selected,setSelected]=useState<Match|null>(null),[messages,setMessages]=useState<Message[]>([]),[chat,setChat]=useState('');
  const [state,setState]=useState('Ready for synthetic-data testing'),[premium,setPremium]=useState('free');
  const [ownerId,setOwnerId]=useState(''),[disclosureText,setDisclosureText]=useState('Not requested');
  async function api(path:string,method='GET',payload?:object,auth=session):Promise<any>{
    if(!SAFE)throw new Error('Unapproved API URL; use HTTPS or local Android emulator only');
    const response=await fetch(BASE+path,{method,headers:{'content-type':'application/json',...(auth?{Authorization:`Bearer ${auth.token}`}:{})},
      body:payload?JSON.stringify(payload):undefined});
    const body=await response.json();if(!response.ok)throw new Error(body.error||`HTTP_${response.status}`);return body;
  }
  const task=(label:string,action:()=>Promise<void>)=>{action().then(()=>setState(`${label}: complete`)).catch(e=>{setState(`${label}: ${e.message}`);Alert.alert(label,String(e.message));});};
  function auth(register:boolean){task(register?'Registration':'Login',async()=>{
    const out=await api(register?'/v1/auth/register':'/v1/auth/login','POST',register?
      {email,password,ageConfirmed:true,locale:'en'}:{email,password},null);
    setSession({token:out.token,userId:out.userId});
  });}
  async function refresh(){const d=await api('/v1/discover');const m=await api('/v1/matches');
    setProfiles(d.profiles);setMatches(m.matches);setPremium((await api('/v1/subscriptions/me')).entitlement.plan);}
  async function openConversation(m:Match){const response=await api(`/v1/matches/${m.id}/messages`);setSelected(m);setMessages(response.messages);}
  async function send(){if(!selected||!chat.trim())return;await api(`/v1/matches/${selected.id}/messages`,'POST',{text:chat});setChat('');await openConversation(selected);}
  async function like(p:Profile){const r=await api('/v1/likes','POST',{targetUserId:p.id});setState(r.matched?'Mutual match created':'Like recorded');await refresh();}
  async function block(){if(!selected)return;await api('/v1/blocks','POST',{targetUserId:selected.otherUserId});setSelected(null);setMessages([]);await refresh();}
  async function report(){if(!selected)return;await api('/v1/reports','POST',{targetUserId:selected.otherUserId,category:'harassment'});setState('Report submitted for human moderation; not reviewed automatically');}
  async function grant(){if(!selected)return;await api('/v1/disclosures/grants','POST',{viewerUserId:selected.otherUserId});}
  async function revoke(){if(!selected)return;await api('/v1/disclosures/revoke','POST',{viewerUserId:selected.otherUserId});}
  async function readDisclosure(){if(!selected)return;const d=await api(`/v1/disclosures/${selected.otherUserId}`);setDisclosureText(d.visible?d.text:'Not shared with you');}
  if(!SAFE) return <View style={styles.container}><Text style={styles.heading}>Sandbox blocked</Text><Text>Configure an HTTPS API URL or the local Android emulator URL.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={{paddingBottom:60}}>
    <Text accessibilityRole="header" style={styles.heading}>LETZMEET / INTEGRATION SANDBOX</Text>
    <Text style={styles.warning}>SYNTHETIC ACCOUNTS ONLY · NO REAL HEALTH OR IDENTITY DATA · NOT A PUBLIC RELEASE</Text>
    {!session? <View>
      <Text style={styles.section}>Local testing account</Text>
      <Text style={styles.label}>Use invented example.test email addresses and a test password (12+ characters).</Text>
      <Field label="Synthetic email" value={email} set={setEmail}/>
      <Field label="Test password" value={password} set={setPassword} secret/>
      <Text style={styles.label}>Registration confirms you are 18+. This sandbox does not perform age verification.</Text>
      <Button label="Create synthetic account" press={()=>auth(true)}/>
      <Button label="Sign in" press={()=>auth(false)}/>
    </View>:<View>
      <Text style={styles.section}>Session active (test account)</Text>
      <Text selectable style={styles.code}>{session.userId}</Text>
      <Field label="Display name" value={name} set={setName}/>
      <Field label="Profile bio (test text)" value={bio} set={setBio}/>
      <Field label="Relationship intention" value={intent} set={setIntent}/>
      <Button label="Save synthetic profile" press={()=>task('Profile save',async()=>{await api('/v1/profile','POST',{displayName:name,bio,metro:'Johannesburg',relationshipIntent:intent});})}/>
      <Button label="Refresh discovery, matches and plan" press={()=>task('Refresh',refresh)}/>
      <Text style={styles.section}>Discover</Text>
      {profiles.map(p=><View key={p.id} style={styles.card}>
        <Text style={styles.cardTitle}>{p.displayName} · {p.metro}</Text><Text>{p.bio} · {p.relationshipIntent}</Text>
        <Button label={`Like ${p.displayName}`} press={()=>task('Like',()=>like(p))}/>
      </View>)}
      <Text style={styles.section}>Mutual matches</Text>
      {matches.map(m=><Button key={m.id} label={`Open conversation with ${m.otherDisplayName}`} press={()=>task('Messages',()=>openConversation(m))}/>)}
      {selected&&<View style={styles.card}>
        <Text style={styles.cardTitle}>Private conversation: {selected.otherDisplayName}</Text>
        {messages.map(x=><Text key={x.id} style={styles.message}>{x.senderId===session.userId?'Me':'Match'}: {x.text}</Text>)}
        <Field label="Message (synthetic only)" value={chat} set={setChat}/>
        <Button label="Send test message" press={()=>task('Message',send)}/>
        <Button label="Share my synthetic disclosure with this match" press={()=>task('Consent grant',grant)}/>
        <Button label="Revoke their disclosure access" press={()=>task('Revoke',revoke)}/>
        <Button label="Read disclosure shared with me" press={()=>task('Read disclosure',readDisclosure)}/>
        <Text>Disclosure result: {disclosureText}</Text>
        <Button label="Report test profile" press={()=>task('Report',report)}/>
        <Button label="Block this user immediately" press={()=>task('Block',block)}/>
      </View>}
      <Text style={styles.section}>Privacy Vault</Text>
      <Text>Stores a fixed, fictional value for local permission tests only.</Text>
      <Button label="Store synthetic disclosure" press={()=>task('Vault storage',async()=>{await api('/v1/disclosures','POST',{text:'SYNTHETIC TEST DISCLOSURE — NO REAL HEALTH STATUS'});})}/>
      <Text style={styles.section}>Subscriptions</Text><Text>Current entitlement: {premium}</Text>
      <Button label="Request paid checkout (expected to be blocked)" press={()=>task('Checkout',async()=>{await api('/v1/subscriptions/checkout','POST',{plan:'plus'});})}/>
      <Button label="Sign out locally" press={()=>{setSession(null);setSelected(null);setMessages([]);}}/>
    </View>}
    <Text accessibilityLiveRegion="polite" style={styles.status}>{state}</Text>
  </ScrollView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#FFF9F0',padding:18},heading:{fontSize:23,fontWeight:'800',color:'#132C3A',marginTop:24,marginBottom:12},warning:{backgroundColor:'#FFE6DF',color:'#7D2822',fontWeight:'700',padding:10,marginBottom:18},section:{fontSize:19,fontWeight:'700',color:'#176B66',marginTop:18,marginBottom:8},label:{fontSize:14,color:'#132C3A',marginBottom:5},field:{borderWidth:1,borderColor:'#A7B4BA',borderRadius:8,padding:12,backgroundColor:'white',color:'#132C3A'},button:{backgroundColor:'#176B66',borderRadius:8,padding:12,marginTop:8,marginBottom:4},buttonText:{color:'white',fontWeight:'700',textAlign:'center'},code:{fontSize:11},card:{backgroundColor:'white',padding:12,borderRadius:10,marginVertical:6,borderWidth:1,borderColor:'#ECE1D8'},cardTitle:{fontSize:17,fontWeight:'700',marginBottom:6},message:{padding:7,backgroundColor:'#DFF3EE',marginVertical:2},status:{marginTop:26,color:'#132C3A',padding:12,backgroundColor:'#E9E3F8'}});
