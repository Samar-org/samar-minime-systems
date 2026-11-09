import { describe,it,expect } from 'vitest';
import { parseGeneratedImage } from '../services/nano-banana.adapter';
describe('image provider response validation',()=>{
 it('extracts image metadata from a valid response without forwarding text',()=>{
  expect(parseGeneratedImage({candidates:[{content:{parts:[{text:'private response text'},
   {inlineData:{mimeType:'image/png',data:'dGVzdA=='}}]}}]})).toEqual({imageBase64:'dGVzdA==',mimeType:'image/png'});
 });
 it('rejects malformed provider data',()=>{
  for(const data of [null,{}, {candidates:[]},{candidates:[{content:{parts:[{inlineData:{mimeType:'image/png'}}]}}]}])
   expect(()=>parseGeneratedImage(data)).toThrow('No valid image generated');
 });
 it('does not echo provider refusal text or return a non-image payload',()=>{
  for(const parts of [[{text:'private refusal'}],[{inlineData:{mimeType:'text/plain',data:'private'}}]])
   expect(()=>parseGeneratedImage({candidates:[{content:{parts}}]})).toThrow(/^No valid image generated$/);
 });
});
