// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Fireworks.Common
{
    using System;
    using System.Net.Http;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    // send ping to counter, until cancellaed
    public partial class PingClient
    {
        private const string OBJECTCOUNTER_ADDRESS = "OBJECTCOUNTER_ADDRESS";

        private static readonly HttpClient Client;
        private static Random Rand;

        private readonly string objectCounterAddress;
        private readonly ObjectInfo objInfo;
        private readonly PingSettings pingSettings;
        private bool reportError;

        public PingClient()
            : this(
                  GetObjectCounterAddressFromEnvironment(),
                  ObjectInfo.FromEnvironment(),
                  PingSettings.FromEnvironment())
        {
        }

        public PingClient(
            string objectCounterAddress,
            ObjectInfo objInfo,
            PingSettings pingSettings)
        {
            this.objectCounterAddress = objectCounterAddress;
            this.objInfo = objInfo;
            this.pingSettings = pingSettings;
            this.reportError = true;
        }

        static PingClient()
        {
            Rand = new Random();
            Client = new HttpClient();
        }

        private static string GetObjectCounterAddressFromEnvironment()
        {
            if (Environment.GetEnvironmentVariable(OBJECTCOUNTER_ADDRESS) != null)
            {
                return Environment.GetEnvironmentVariable(OBJECTCOUNTER_ADDRESS);
            }
            else
            {
                return "web:8080";
            }
        }

        public async Task SendPingAsync(CancellationToken cancellationToken)
        {
            var requestUri = new Uri($"http://{this.objectCounterAddress}/api/values?id={this.objInfo.Id}&type={this.objInfo.Type}&version={this.objInfo.Version}");
            Console.WriteLine($"{DateTime.UtcNow}: Sending ping to {requestUri}");

            while (!cancellationToken.IsCancellationRequested)
            {
                var success = await SendData(requestUri, cancellationToken);
                await Task.Delay(GetDueTime(success), cancellationToken);
            }
        }

        private async Task<bool> SendData(Uri requestUri, CancellationToken cancellationToken)
        {
            try
            {
                var request = new HttpRequestMessage()
                {
                    Method = HttpMethod.Post,
                    Content = new StringContent(string.Empty, Encoding.UTF8),
                    RequestUri = requestUri
                };

                request.Content.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse("text/plain; charset=utf-8");

                var response = await Client.SendAsync(request, cancellationToken);
                if (response.StatusCode != System.Net.HttpStatusCode.OK)
                {
                    if (this.reportError)
                    {
                        Console.WriteLine($"{DateTime.UtcNow}: Error in sending the data {response}");
                        this.reportError = false;
                    }
                }
                else
                {
                    this.reportError = true;
                    return true;
                }
            }
            catch (Exception e)
            {
                if (this.reportError)
                {
                    Console.WriteLine($"{DateTime.UtcNow}: Error in sending the data {e.ToString()}");
                    this.reportError = false;
                }
            }

            return false;
        }

        private TimeSpan GetDueTime(bool success)
        {
            if (success)
            {
                var dueTimeMillis =
                    Rand.Next(this.pingSettings.PingIntervalMillis) +
                    Rand.Next(this.pingSettings.PingFuzzIntervalMillis);
                return TimeSpan.FromMilliseconds(dueTimeMillis);
            }
            else
            {
                var dueTimeMillis =
                    Rand.Next(this.pingSettings.PingFailureRetryIntervalMillis) +
                    Rand.Next(this.pingSettings.PingFuzzIntervalMillis);
                return TimeSpan.FromMilliseconds(dueTimeMillis);
            }
        }
    }
}