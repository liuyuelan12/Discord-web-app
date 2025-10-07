
Applications
Teams
Servers
Embed Debugger
Documentation
Intro
Change Log
API Reference
quick start
Overview of Apps
Getting Started
interactions
Overview
Receiving and Responding
Application Commands
components
Overview
Using Message Components
Using Modal Components
Component Reference
activities
Overview
How Activities Work
Quickstart
Development Guides
Design Patterns
discord social sdk
Overview
Core Concepts
Getting Started
Development Guides
Design Guidelines
How To
Social SDK Reference
rich presence
Overview
Using with the Embedded App SDK
Using with the Discord Social SDK
Using with the Game SDK
legacy
Best Practices
monetization
Overview
Enabling Monetization
Managing SKUs
Implementing App Subscriptions
Implementing One-Time Purchases
Implementing IAP for Activities
discovery
Overview
Enabling Discovery
Best Practices
events
Overview
Using Gateway
Gateway Events
Webhook Events
developer tools
Embedded App SDK
Community Resources
Game SDK
legacy
resources
Application Role Connection Metadata
Application
Audit Log
Auto Moderation
Channel
Emoji
Entitlement
Guild Scheduled Event
Guild Template
Guild
Invite
Lobby
Message
Poll
SKU
Soundboard
Stage Instance
Sticker
Subscription
User
Voice
Webhook
topics
Certified Devices
OAuth2
Opcodes and Status Codes
Permissions
Rate Limits
RPC
Teams
Threads
Voice
tutorials
Configuring App Metadata for Linked Roles
Developing A User-Installable App
Hosting on Cloudflare Workers
Upgrading to Application Commands
policies and agreements
Developer Policy
Developer Terms of Service
API Reference
Discord's API is based around two core layers, a HTTPS/REST API for general operations, and persistent secure WebSocket based connection for sending and subscribing to real-time events. The most common use case of the Discord API will be providing a service, or access to a platform through the OAuth2 API.

Base URL
Copy
https://discord.com/api
API Versioning
Some API and Gateway versions are now non-functioning, and are labeled as discontinued in the table below for posterity. Trying to use these versions will fail and return 400 Bad Request.
Discord exposes different versions of our API. You should specify which version to use by including it in the request path like https://discord.com/api/v{version_number}. Omitting the version number from the route will route requests to the current default version (marked below). You can find the change log for the newest API version here.

API Versions
Version	Status	Default
10	Available	
9	Available	
8	Deprecated	
7	Deprecated	
6	Deprecated	✓
5	Discontinued	
4	Discontinued	
3	Discontinued	
Error Messages
Starting in API v8, we've improved error formatting in form error responses. The response will tell you which JSON key contains the error, the error code, and a human readable error message. We will be frequently adding new error messages, so a complete list of errors is not feasible and would be almost instantly out of date. Here are some examples instead:

Array Error
Copy
{
  "code": 50035,
  "errors": {
    "activities": {
      "0": {
        "platform": {
          "_errors": [
            {
              "code": "BASE_TYPE_CHOICES",
              "message": "Value must be one of ('desktop', 'android', 'ios')."
            }
          ]
        },
        "type": {
          "_errors": [
            {
              "code": "BASE_TYPE_CHOICES",
              "message": "Value must be one of (0, 1, 2, 3, 4, 5)."
            }
          ]
        }
      }
    }
  },
  "message": "Invalid Form Body"
}
Object Error
Copy
{
  "code": 50035,
  "errors": {
    "access_token": {
      "_errors": [
        {
          "code": "BASE_TYPE_REQUIRED",
          "message": "This field is required"
        }
      ]
    }
  },
  "message": "Invalid Form Body"
}
Request Error
Copy
{
  "code": 50035,
  "message": "Invalid Form Body",
  "errors": {
    "_errors": [
      {
        "code": "APPLICATION_COMMAND_TOO_LARGE",
        "message": "Command exceeds maximum size (8000)"
      }
    ]
  }
}
Authentication
Authenticating with the Discord API can be done in one of two ways:

Using a bot token found on the Bot page within your app's settings. For more information on bots see bots vs user accounts.
Using an OAuth2 bearer token gained through the OAuth2 API.
For all authentication types, authentication is performed with the Authorization HTTP header in the format Authorization: TOKEN_TYPE TOKEN.

Example Bot Token Authorization Header
Copy
Authorization: Bot MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ.ZnCjm1XVW7vRze4b7Cq4se7kKWs
Example Bearer Token Authorization Header
Copy
Authorization: Bearer CZhtkLDpNYXgPH9Ml6shqh2OwykChw
Encryption
All HTTP-layer services and protocols (e.g. HTTP, WebSocket) within the Discord API are using TLS 1.2.

Snowflakes
Discord utilizes Twitter's snowflake format for uniquely identifiable descriptors (IDs). These IDs are guaranteed to be unique across all of Discord, except in some unique scenarios in which child objects share their parent's ID. Because Snowflake IDs are up to 64 bits in size (e.g. a uint64), they are always returned as strings in the HTTP API to prevent integer overflows in some languages. See Gateway ETF/JSON for more information regarding Gateway encoding.

Snowflake ID Broken Down in Binary
Copy
111111111111111111111111111111111111111111 11111 11111 111111111111
64                                         22    17    12          0
Snowflake ID Format Structure (Left to Right)
Field	Bits	Number of bits	Description	Retrieval
Timestamp	63 to 22	42 bits	Milliseconds since Discord Epoch, the first second of 2015 or 1420070400000.	(snowflake >> 22) + 1420070400000
Internal worker ID	21 to 17	5 bits		(snowflake & 0x3E0000) >> 17
Internal process ID	16 to 12	5 bits		(snowflake & 0x1F000) >> 12
Increment	11 to 0	12 bits	For every ID that is generated on that process, this number is incremented	snowflake & 0xFFF
Convert Snowflake to DateTime
175928847299117063
41944705796
1462015105796
2016-04-30 11:18:25.796 UTC
000000100111000100000110010110101100000100
00001
00000
to binary
to decimal
Parse unix timestamp (ms)
+ 1420070400000Discord Epoch (unix timestamp in ms)
Number of milliseconds since the Discord epoch (first seconds of 2015)
InternalworkerID
InternalprocessID
000000000111
Incremented for every generated ID on that process
64
22
12
0
17
Snowflake IDs in Pagination
We typically use snowflake IDs in many of our API routes for pagination. The standardized pagination paradigm we utilize is one in which you can specify IDs before and after in combination with limit to retrieve a desired page of results. You will want to refer to the specific endpoint documentation for details.

It is useful to note that snowflake IDs are just numbers with a timestamp, so when dealing with pagination where you want results from the beginning of time (in Discord Epoch, but 0 works here too) or before/after a specific time you can generate a snowflake ID for that time.

Generating a snowflake ID from a Timestamp Example
Copy
(timestamp_ms - DISCORD_EPOCH) << 22
ID Serialization
There are some cases in which our API and Gateway may return IDs in an unexpected format. Internally, Discord stores IDs as integer snowflakes. When we serialize IDs to JSON, we transform bigints into strings. Given that all Discord IDs are snowflakes, you should always expect a string.

However, there are cases in which passing something to our API will instead return IDs serialized as an integer; this is the case when you send our API or Gateway a value in an id field that is not bigint size. For example, when requesting GUILD_MEMBERS_CHUNK from our gateway:

Copy
// Send
{
  op: 8,
  d: {
    guild_id: '308994132968210433',
    user_ids: [ '123123' ]
  }
}

// Receive
{
  t: 'GUILD_MEMBERS_CHUNK',
  s: 3,
  op: 0,
  d: {
    not_found: [ 123123 ],
    members: [],
    guild_id: '308994132968210433'
  }
}
You can see in this case that the sent user_id is not a bigint; therefore, when it is serialized back to JSON by Discord, it is not transformed into a string. This will never happen with IDs that come from Discord. But, this can happen if you send malformed data in your requests.

ISO8601 Date/Time
Discord utilizes the ISO8601 format for most Date/Times returned in our models. This format is referred to as type ISO8601 within tables in this documentation.

Nullable and Optional Resource Fields
Resource fields that may contain a null value have types that are prefixed with a question mark. Resource fields that are optional have names that are suffixed with a question mark.

Example Nullable and Optional Fields
Field	Type
optional_field?	string
nullable_field	?string
optional_and_nullable_field?	?string
Consistency
Discord operates at a scale where true consistency is impossible. Because of this, lots of operations in our API and in-between our services are eventually consistent. Due to this, client actions can never be serialized and may be executed in any order (if executed at all). Along with these constraints, events in Discord may:

Never be sent to a client
Be sent exactly one time to the client
Be sent up to N times per client
Clients should operate on events and results from the API in as much of an idempotent behavior as possible.

HTTP API
User Agent
Clients using the HTTP API must provide a valid User Agent which specifies information about the client library and version in the following format:

User Agent Example
Copy
User-Agent: DiscordBot ($url, $versionNumber)
Clients may append more information and metadata to the end of this string as they wish.

Client requests that do not have a valid User Agent specified may be blocked and return a Cloudflare error.
Content Type
Clients using the HTTP API must provide a valid Content-Type header, either application/json, application/x-www-form-urlencoded, or multipart/form-data, except where specified. Failing to do so will result in a 50035 "Invalid form body" error.

Rate Limiting
The HTTP API implements a process for limiting and preventing excessive requests in accordance with RFC 6585. API users that regularly hit and ignore rate limits will have their API keys revoked, and be blocked from the platform. For more information on rate limiting of requests, please see the Rate Limits section.

Boolean Query Strings
Certain endpoints in the API are documented to accept booleans for their query string parameters. While there is no standard system for boolean representation in query string parameters, Discord represents such cases using True, true, or 1 for true and False, false or 0 for false.

Gateway (WebSocket) API
Discord's Gateway API is used for maintaining persistent, stateful websocket connections between your client and our servers. These connections are used for sending and receiving real-time events your client can use to track and update local state. The Gateway API uses secure websocket connections as specified in RFC 6455. For information on opening Gateway connections, please see the Gateway API section.

Message Formatting
Discord utilizes a subset of markdown for rendering message content on its clients, while also adding some custom functionality to enable things like mentioning users and channels. This functionality uses the following formats:

Formats
Type	Structure	Example
User	<@USER_ID>	<@80351110224678912>
User *	<@!USER_ID>	<@!80351110224678912>
Channel	<#CHANNEL_ID>	<#103735883630395392>
Role	<@&ROLE_ID>	<@&165511591545143296>
Slash Command **	</NAME:COMMAND_ID>	</airhorn:816437322781949972>
Standard Emoji	Unicode Characters	🦶
Custom Emoji	<:NAME:ID>	<:mmLol:216154654256398347>
Custom Emoji (Animated)	<a:NAME:ID>	<a:b1nzy:392938283556143104>
Unix Timestamp ***	<t:TIMESTAMP>	<t:1618953630>
Unix Timestamp (Styled) ***	<t:TIMESTAMP:STYLE>	<t:1618953630:d>
Guild Navigation	<id:TYPE>	<id:customize>
Email ****	<USERNAME@DOMAIN>	<nelly@discord.com>
Phone Number ****	<+PHONE_NUMBER>	<+1 (555) 123 4567>
Using the markdown for either users, roles, or channels will usually mention the target(s) accordingly, but this can be suppressed using the allowed_mentions parameter (when creating a message). Standard emoji are currently rendered using Twemoji for Desktop/Android and Apple's native emoji on iOS.

* User mentions with an exclamation mark are deprecated and should be handled like any other user mention.

** Subcommands and subcommand groups can also be mentioned by using respectively </NAME SUBCOMMAND:ID> and </NAME SUBCOMMAND_GROUP SUBCOMMAND:ID>.

*** Timestamps are expressed in seconds and display the given timestamp in the user's timezone and locale.

**** Email and phone number markdown uses mailto: and tel: URI schemes respectively that can optionally be prefixed (e.g. <mailto:nelly@discord.com>). Email markdown supports headers, values must be URL Encoded (e.g. <nelly@discord.com?subject=Message%20Title&body=Message%20Content>).

Timestamp Styles
Style	Example Output	Description
t	16:20	Short Time
T	16:20:30	Long Time
d	20/04/2021	Short Date
D	20 April 2021	Long Date
f *	20 April 2021 16:20	Short Date/Time
F	Tuesday, 20 April 2021 16:20	Long Date/Time
R	2 months ago	Relative Time
* Default style used when no style is specified.

Guild Navigation Types
Guild navigation types link to the corresponding resource in the current server.

Type	Description
customize	Customize tab with the server's onboarding prompts
browse	Browse Channels tab
guide	Server Guide
linked-roles	Linked Roles
linked-roles
Linked Role connection
Image Formatting
Image Base Url
Copy
https://cdn.discordapp.com/
Discord uses ids and hashes to render images in the client. These hashes can be retrieved through various API requests, like Get User. Below are the formats, size limitations, and CDN endpoints for images in Discord. The returned format can be changed by changing the extension name at the end of the URL. The returned size can be changed by appending a querystring of ?size=desired_size to the URL. Image size can be any power of two between 16 and 4096.

Image Formats
Name	Extension
JPEG	.jpg, .jpeg
PNG	.png
WebP	.webp
GIF	.gif
AVIF	.avif
Lottie	.json
CDN Endpoints
Type	Path	Supports
Custom Emoji	emojis/emoji_id.png *****	PNG, JPEG, WebP, GIF, AVIF
Guild Icon	icons/guild_id/guild_icon.png *	PNG, JPEG, WebP, GIF
Guild Splash	splashes/guild_id/guild_splash.png	PNG, JPEG, WebP
Guild Discovery Splash	discovery-splashes/guild_id/guild_discovery_splash.png	PNG, JPEG, WebP
Guild Banner	banners/guild_id/guild_banner.png *	PNG, JPEG, WebP, GIF
User Banner	banners/user_id/user_banner.png *	PNG, JPEG, WebP, GIF
Default User Avatar	embed/avatars/index.png ** ***	PNG
User Avatar	avatars/user_id/user_avatar.png *	PNG, JPEG, WebP, GIF
Guild Member Avatar	guilds/guild_id/users/user_id/avatars/member_avatar.png *	PNG, JPEG, WebP, GIF
Avatar Decoration	avatar-decoration-presets/avatar_decoration_data_asset.png	PNG
Application Icon	app-icons/application_id/icon.png	PNG, JPEG, WebP
Application Cover	app-icons/application_id/cover_image.png	PNG, JPEG, WebP
Application Asset	app-assets/application_id/asset_id.png	PNG, JPEG, WebP
Achievement Icon	app-assets/application_id/achievements/achievement_id/icons/icon_hash.png	PNG, JPEG, WebP
Store Page Asset	app-assets/application_id/store/asset_id	PNG, JPEG, WebP
Sticker Pack Banner	app-assets/710982414301790216/store/sticker_pack_banner_asset_id.png	PNG, JPEG, WebP
Team Icon	team-icons/team_id/team_icon.png	PNG, JPEG, WebP
Sticker	stickers/sticker_id.png *** ****	PNG, Lottie, GIF
Role Icon	role-icons/role_id/role_icon.png	PNG, JPEG, WebP
Guild Scheduled Event Cover	guild-events/scheduled_event_id/scheduled_event_cover_image.png	PNG, JPEG, WebP
Guild Member Banner	guilds/guild_id/users/user_id/banners/member_banner.png *	PNG, JPEG, WebP, GIF
Guild Tag Badge	guild-tag-badges/guild_id/badge_hash.png	PNG, JPEG, WebP
* In the case of endpoints that support GIFs, the hash will begin with a_ if it is available in GIF format. These images can also be retrieved as animated WebP using the ?animated=true querystring parameter. (example: a_1269e74af4df7417b13759eae50c83dc)

** In the case of the Default User Avatar endpoint, the value for index depends on whether the user is migrated to the new username system. For users on the new username system, index will be (user_id >> 22) % 6. For users on the legacy username system, index will be discriminator % 5.

*** In the case of the Default User Avatar and Sticker endpoints, the size of images returned is constant with the "size" querystring parameter being ignored.

**** In the case of the Sticker endpoint, the sticker will be available as PNG if its format_type is PNG or APNG, GIF if its format_type is GIF, and as Lottie if its format_type is LOTTIE.

***** For Custom Emoji, we highly recommend requesting emojis as WebP for maximum performance and compatibility. Emojis can be uploaded as JPEG, PNG, GIF, WebP, and AVIF formats. WebP and AVIF formats must be requested as WebP since they don't convert well to other formats. The Discord client uses WebP for all emojis displayed in-app. See the Emoji Resource page for more details.

Sticker GIFs do not use the CDN base url, and can be accessed at https://media.discordapp.net/stickers/<sticker_id>.gif.
Image Data
Image data is a Data URI scheme that supports JPG, GIF, and PNG formats. An example Data URI format is:

Copy
data:image/jpeg;base64,BASE64_ENCODED_JPEG_IMAGE_DATA
Ensure you use the proper content type (image/jpeg, image/png, image/gif) that matches the image data being provided.

Signed Attachment CDN URLs
Attachments uploaded to Discord's CDN (like user and bot-uploaded images) have signed URLs with a preset expiry time. Discord automatically refreshes attachment CDN URLs that appear within the client, so when your app receives a payload with a signed URL (like when you fetch a message), it will be valid.

When passing CDN URLs into API fields, like url in an embed image object and avatar_url for webhooks, your app can pass the CDN URL without any parameters as the value and Discord will automatically render and refresh the URL.

The standard CDN endpoints listed above are not signed, so they will not expire.

Example Attachment CDN URL
Copy
https://cdn.discordapp.com/attachments/1012345678900020080/1234567891233211234/my_image.png?ex=65d903de&is=65c68ede&hm=2481f30dd67f503f54d020ae3b5533b9987fae4e55f2b4e3926e08a3fa3ee24f&
Attachment CDN URL Parameters
Parameter	Description
ex	Hex timestamp indicating when an attachment CDN URL will expire
is	Hex timestamp indicating when the URL was issued
hm	Unique signature that remains valid until the URL's expiration
Uploading Files
The file upload size limit applies to each file in a request. The default limit is 10 MiB for all users, but may be higher for users depending on their Nitro status or by the server's Boost Tier. The attachment_size_limit value provided when working with interactions is calculated as the maximum of these values.
Some endpoints support file attachments, indicated by the files[n] parameter. To add file(s), the standard application/json body must be replaced by a multipart/form-data body. The JSON message body can optionally be provided using the payload_json parameter.

All files[n] parameters must include a valid Content-Disposition subpart header with a filename and unique name parameter. Each file parameter must be uniquely named in the format files[n] such as files[0], files[1], or files[42]. The suffixed index n is the snowflake placeholder that can be used in the attachments field, which can be passed to the payload_json parameter (or Callback Data Payloads).

Images can also be referenced in embeds using the attachment://filename URL. The filename for these URLs must be ASCII alphanumeric with underscores, dashes, or dots. An example payload is provided below.

Editing Message Attachments
The attachments JSON parameter includes all files that will be appended to the message, including new files and their respective snowflake placeholders (referenced above). When making a PATCH request, only files listed in the attachments parameter will be appended to the message. Any previously-added files that aren't included will be removed.

Example Request Bodies (multipart/form-data)
Note that these examples are small sections of an HTTP request to demonstrate behavior of this endpoint - client libraries will set their own form boundaries (boundary is just an example). For more information, refer to the multipart/form-data spec.

This example demonstrates usage of the endpoint without payload_json.

Copy
--boundary
Content-Disposition: form-data; name="content"

Hello, World!
--boundary
Content-Disposition: form-data; name="tts"

true
--boundary--
This example demonstrates usage of the endpoint with payload_json and all content fields (content, embeds, files[n]) set.

Copy
--boundary
Content-Disposition: form-data; name="payload_json"
Content-Type: application/json

{
  "content": "Hello, World!",
  "embeds": [{
    "title": "Hello, Embed!",
    "description": "This is an embedded message.",
    "thumbnail": {
      "url": "attachment://myfilename.png"
    },
    "image": {
      "url": "attachment://mygif.gif"
    }
  }],
  "message_reference": {
    "message_id": "233648473390448641"
  },
  "attachments": [{
      "id": 0,
      "description": "Image of a cute little cat",
      "filename": "myfilename.png"
  }, {
      "id": 1,
      "description": "Rickroll gif",
      "filename": "mygif.gif"
  }]
}
--boundary
Content-Disposition: form-data; name="files[0]"; filename="myfilename.png"
Content-Type: image/png

[image bytes]
--boundary
Content-Disposition: form-data; name="files[1]"; filename="mygif.gif"
Content-Type: image/gif

[image bytes]
--boundary--
Using Attachments within Embeds
You can upload attachments when creating a message and use those attachments within your embed. To do this, you will want to upload files as part of your multipart/form-data body. Make sure that you're uploading files which contain a filename, as you will need to reference it in your payload.

Only .jpg, .jpeg, .png, .webp, and .gif may be used at this time. Other file types are not supported.
Within an embed object, you can set an image to use an attachment as its URL with the attachment scheme syntax: attachment://filename.png

For example:

Copy
{
  "embeds": [{
    "image": {
      "url": "attachment://screenshot.png"
    }
  }]
}
Locales
Locale	Language Name	Native Name
id	Indonesian	Bahasa Indonesia
da	Danish	Dansk
de	German	Deutsch
en-GB	English, UK	English, UK
en-US	English, US	English, US
es-ES	Spanish	Español
es-419	Spanish, LATAM	Español, LATAM
fr	French	Français
hr	Croatian	Hrvatski
it	Italian	Italiano
lt	Lithuanian	Lietuviškai
hu	Hungarian	Magyar
nl	Dutch	Nederlands
no	Norwegian	Norsk
pl	Polish	Polski
pt-BR	Portuguese, Brazilian	Português do Brasil
ro	Romanian, Romania	Română
fi	Finnish	Suomi
sv-SE	Swedish	Svenska
vi	Vietnamese	Tiếng Việt
tr	Turkish	Türkçe
cs	Czech	Čeština
el	Greek	Ελληνικά
bg	Bulgarian	български
ru	Russian	Pусский
uk	Ukrainian	Українська
hi	Hindi	हिन्दी
th	Thai	ไทย
zh-CN	Chinese, China	中文
ja	Japanese	日本語
zh-TW	Chinese, Taiwan	繁體中文
ko	Korean	한국어
On this page
API Versioning
Error Messages
Authentication
Encryption
Snowflakes
ID Serialization
ISO8601 Date/Time
Nullable and Optional Resource Fields
Consistency
HTTP API
Gateway (WebSocket) API
Message Formatting
Image Formatting
Image Data
Uploading Files
Locales
