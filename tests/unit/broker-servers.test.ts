import {expect,it} from 'vitest';
import {justMarketsServerNames,justMarketsServerSuggestions} from '../../apps/web/server/broker-servers.js';
it('limits provider suggestions to JustMarkets MT5 names, deduplicating and rejecting malformed results',()=>{
 expect(justMarketsServerNames({'Just Global Markets Ltd.':['JustMarkets-Live2','JustMarkets-Live2','https://example.test','Other-Live',null],'Other Broker':['JustMarkets-Live'],'JustMarkets Ltd.':['JustMarkets-Demo2','JustMarkets-LIVE7']})).toEqual(['JustMarkets-Demo2','JustMarkets-Live2','JustMarkets-LIVE7']);
 for(const response of [null,[],false,'bad',{'JustMarkets Ltd':'bad'}])expect(justMarketsServerNames(response)).toEqual([]);
 expect(justMarketsServerSuggestions).toHaveLength(4);
});
