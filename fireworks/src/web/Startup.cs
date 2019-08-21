// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Samples.Fireworks.Web
{
    using System;
    using System.Net.WebSockets;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Http;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;

    using Microsoft.ServiceFabricMesh.Samples.Fireworks.Common;

    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddMvc();
            services.AddSingleton<IObjectCounter>(CreateObjectCounter());
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseMvc();
            var webSocketOptions = new WebSocketOptions()
            {
                KeepAliveInterval = TimeSpan.FromSeconds(120),
            };
            app.UseWebSockets(webSocketOptions);

            app.Use(async (context, next) =>
            {
                if (context.Request.Path == "/data")
                {
                    if (context.WebSockets.IsWebSocketRequest)
                    {
                        WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
                        await SendData(context, webSocket, app.ApplicationServices.GetService<IObjectCounter>());
                    }
                    else
                    {
                        context.Response.StatusCode = 400;
                    }
                }
                else
                {
                    await next();
                }

            });
        }

        private async Task SendData(HttpContext context, WebSocket webSocket, IObjectCounter objectCounter)
        {
            using (webSocket)
            {
                while (true)
                {
                    try
                    {
                        byte[] buffer = Encoding.UTF8.GetBytes(objectCounter.GetCountsJson());

                        await webSocket.SendAsync(
                            new ArraySegment<byte>(buffer, 0, buffer.Length),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None);

                        if (webSocket.State != WebSocketState.Open)
                        {
                            break;
                        }
                    }
                    catch (WebSocketException)
                    {
                        // If the browser quit or the socket was closed, exit this loop so we can get a new browser socket.
                        break;
                    }

                    // wait a bit and continue. This determines the client refresh rate.
                    await Task.Delay(objectCounter.RefreshInterval, CancellationToken.None);
                }
            }
        }


        private static IObjectCounter CreateObjectCounter()
        {
            if (!long.TryParse(Environment.GetEnvironmentVariable("OBJECTCOUNTER_REFRESH_INTERVAL_MILLIS"), out long refreshIntervalMillis))
            {
                refreshIntervalMillis = 50;
            }
            
            if (!int.TryParse(Environment.GetEnvironmentVariable("OBJECTCOUNTER_ITEM_EXPIRY_INTERVAL_SECONDS"), out int expiryIntervalSeconds))
            {
                expiryIntervalSeconds = 120;
            }
    
            if (!int.TryParse(Environment.GetEnvironmentVariable("OBJECTCOUNTER_ITEM_EXPIRY_FUZZ_INTERVAL_SECONDS"), out int fuzzIntervalSeconds))
            {
                fuzzIntervalSeconds = 30;
            }

            if (!int.TryParse(Environment.GetEnvironmentVariable("OBJECTCOUNTER_MAX_COUNT_OUTPUT_LIMIT"), out int maxCountOutputLimit))
            {
                maxCountOutputLimit = -1;
            }

            Console.WriteLine($"{DateTime.UtcNow}: Creating ObjectCounter: Refresh = {refreshIntervalMillis} milliseconds, Expiry = {expiryIntervalSeconds} seconds, Expiry Fuzz = {fuzzIntervalSeconds} seconds, Max Count Output Limit = {maxCountOutputLimit}.");
            return new ObjectCounter(expiryIntervalSeconds, fuzzIntervalSeconds, refreshIntervalMillis, maxCountOutputLimit);
        }
    }
}
