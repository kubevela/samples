// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Samples.Fireworks.Web.Controllers
{
    using System.IO;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.ServiceFabricMesh.Samples.Fireworks.Common;

    [Route("api/[controller]")]
    public class ValuesController : Controller
    {
        private IObjectCounter objectCounter;

        public ValuesController(IObjectCounter objectCounter)
        {
            this.objectCounter = objectCounter;
        }

        // GET api/values/getjson
        [HttpGet]
        public string getjson()
        {
            return this.objectCounter.GetCountsJson();
        }

        // POST api/values
        [HttpPost]
        public ActionResult Post([FromQuery]string id, [FromQuery]string type, [FromQuery]string version)
        {
            var host = this.HttpContext.Request.Host;
            var req = this.HttpContext.Request;
            var jsonData = string.Empty;

            using (StreamReader reader = new StreamReader(req.Body))
            {
                jsonData = reader.ReadToEnd();
            }

            this.objectCounter.CountObject(id, type, version);
            return Ok();
        }
    }
}
