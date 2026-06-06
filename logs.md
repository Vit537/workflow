Run docker build \
  docker build \
    --build-arg BACKEND_URL=*** \
    -t $ECR_REGISTRY/workflow/frontend:6f4bc23319acd114a9d9c6a8ca9f7c42b4b09605 ./frontend
  docker tag $ECR_REGISTRY/workflow/frontend:6f4bc23319acd114a9d9c6a8ca9f7c42b4b09605 $ECR_REGISTRY/workflow/frontend:latest
  docker push $ECR_REGISTRY/workflow/frontend:6f4bc23319acd114a9d9c6a8ca9f7c42b4b09605
  docker push $ECR_REGISTRY/workflow/frontend:latest
  shell: /usr/bin/bash -e {0}
  env:
    AWS_REGION: ***
    ECR_REGISTRY: ***
    AWS_DEFAULT_REGION: ***
    AWS_ACCESS_KEY_ID: ***
    AWS_SECRET_ACCESS_KEY: ***
#0 building with "default" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.13kB done
#1 DONE 0.0s

#2 [auth] library/node:pull token for registry-1.docker.io
#2 DONE 0.0s

#3 [auth] library/nginx:pull token for registry-1.docker.io
#3 DONE 0.0s

#4 [internal] load metadata for docker.io/library/node:20-alpine
#4 DONE 0.3s

#5 [internal] load metadata for docker.io/library/nginx:alpine
#5 DONE 0.3s

#6 [internal] load .dockerignore
#6 transferring context: 2B done
#6 DONE 0.0s

#7 [internal] load build context
#7 transferring context: 616.84kB 0.0s done
#7 DONE 0.0s

#8 [stage-1 1/3] FROM docker.io/library/nginx:alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a
#8 resolve docker.io/library/nginx:alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a done
#8 extracting sha256:abaae85d1626e429b3f1209aea369c0af9562cc06b5e075c006e0f699bba35f2
#8 extracting sha256:abaae85d1626e429b3f1209aea369c0af9562cc06b5e075c006e0f699bba35f2 0.1s done
#8 sha256:abaae85d1626e429b3f1209aea369c0af9562cc06b5e075c006e0f699bba35f2 1.88MB / 1.88MB 0.1s done
#8 sha256:43f834d60d8af3f133c7e76a202d28cd62cc026a561edca72ee752ef01bfaacd 628B / 628B 0.1s done
#8 sha256:de1b677d8c003ce9e558f3a0cd4dec3c035f424ecddd68063043a593ad572257 957B / 957B 0.1s
#8 sha256:94d083cf706ab544ec7e9bcaba5c164db87b3d3a56176bf2fca440d535c16b0d 0B / 405B 0.1s
#8 sha256:da954fb959a34e2195e6bf622e6396bf338f99e0fe6d8e641b302d9aaa1f0645 12.41kB / 12.41kB done
#8 sha256:31db9045b34376493fd4fb695d8a8d03bbfffaf6297fcde82d0f925ce2dd329a 2.50kB / 2.50kB done
#8 sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a 10.33kB / 10.33kB done
#8 sha256:de1b677d8c003ce9e558f3a0cd4dec3c035f424ecddd68063043a593ad572257 957B / 957B 0.1s done
#8 sha256:94d083cf706ab544ec7e9bcaba5c164db87b3d3a56176bf2fca440d535c16b0d 405B / 405B 0.1s done
#8 sha256:e654dbbbb9e15a1fa035d24728aeeb60bc655f4ebd4d6215a496b77a7d104697 1.21kB / 1.21kB 0.1s done
#8 sha256:a5008f4a4b257356728e2feaf2b5b9e2054c0c577d324e76abbf14470b5f1cfd 1.40kB / 1.40kB 0.1s done
#8 sha256:fbaed3f7fcbe6a0d591ac8601934f1f05252cee42741fde9e950dce55580af18 20.28MB / 20.28MB 0.2s done
#8 extracting sha256:43f834d60d8af3f133c7e76a202d28cd62cc026a561edca72ee752ef01bfaacd done
#8 extracting sha256:de1b677d8c003ce9e558f3a0cd4dec3c035f424ecddd68063043a593ad572257 done
#8 extracting sha256:94d083cf706ab544ec7e9bcaba5c164db87b3d3a56176bf2fca440d535c16b0d done
#8 extracting sha256:e654dbbbb9e15a1fa035d24728aeeb60bc655f4ebd4d6215a496b77a7d104697 done
#8 extracting sha256:a5008f4a4b257356728e2feaf2b5b9e2054c0c577d324e76abbf14470b5f1cfd done
#8 extracting sha256:fbaed3f7fcbe6a0d591ac8601934f1f05252cee42741fde9e950dce55580af18
#8 extracting sha256:fbaed3f7fcbe6a0d591ac8601934f1f05252cee42741fde9e950dce55580af18 0.5s done
#8 DONE 1.0s

#9 [build 1/7] FROM docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
#9 resolve docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 done
#9 sha256:fff4e2c1b189bf87d63ad8bd07f7f4eb288d6f2b6a07a8bb44c60e8c075d2096 445B / 445B 0.1s done
#9 sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 7.67kB / 7.67kB done
#9 sha256:afdf98210b07b586eb71fa22ba2e432e058e4cd1304d31ed60888755b8c865fb 1.72kB / 1.72kB done
#9 sha256:11cedc39e663e7c5d5cb9cc77a461a0d2adc25537b94e6831a6108f09cb2001b 6.52kB / 6.52kB done
#9 sha256:4feea04c154301db6f4a496efa397b3db96603b1c009c797cfdde77bea8b3287 43.23MB / 43.23MB 0.2s done
#9 sha256:b2cbbfe903b0821005780971ddc5892edcc4ce74c5a48d82e1d2b382edac3122 1.26MB / 1.26MB 0.0s done
#9 extracting sha256:4feea04c154301db6f4a496efa397b3db96603b1c009c797cfdde77bea8b3287 0.8s
#9 extracting sha256:4feea04c154301db6f4a496efa397b3db96603b1c009c797cfdde77bea8b3287 1.2s done
#9 extracting sha256:b2cbbfe903b0821005780971ddc5892edcc4ce74c5a48d82e1d2b382edac3122
#9 extracting sha256:b2cbbfe903b0821005780971ddc5892edcc4ce74c5a48d82e1d2b382edac3122 0.0s done
#9 extracting sha256:fff4e2c1b189bf87d63ad8bd07f7f4eb288d6f2b6a07a8bb44c60e8c075d2096 done
#9 DONE 1.7s

#10 [build 2/7] WORKDIR /app
#10 DONE 0.0s

#11 [build 3/7] COPY package*.json ./
#11 DONE 0.0s

#12 [build 4/7] RUN npm ci
#12 8.076 
#12 8.076 added 489 packages, and audited 490 packages in 8s
#12 8.076 
#12 8.076 112 packages are looking for funding
#12 8.076   run `npm fund` for details
#12 8.096 
#12 8.096 7 vulnerabilities (6 moderate, 1 high)
#12 8.096 
#12 8.096 To address all issues, run:
#12 8.096   npm audit fix
#12 8.096 
#12 8.096 Run `npm audit` for details.
#12 8.099 npm notice
#12 8.099 npm notice New major version of npm available! 10.8.2 -> 11.16.0
#12 8.099 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.16.0
#12 8.099 npm notice To update run: npm install -g npm@11.16.0
#12 8.099 npm notice
#12 DONE 8.1s

#13 [build 5/7] COPY . .
#13 DONE 0.7s

#14 [build 6/7] RUN mkdir -p src/environments &&     printf "export const environment = { production: false, apiUrl: '%s', wsUrl: '%s' };\n" "***" "***" > src/environments/environment.ts &&     printf "export const environment = { production: true, apiUrl: '%s', wsUrl: '%s' };\n" "***" "***" > src/environments/environment.prod.ts
#14 DONE 0.1s

#15 [build 7/7] RUN npm run build -- --configuration production
#15 0.306 
#15 0.306 > frontend@0.0.0 build
#15 0.306 > ng build --configuration production
#15 0.306 
#15 1.119 ❯ Building...
#15 12.89 ✔ Building...
#15 12.89 Application bundle generation failed. [11.765 seconds] - 2026-06-01T06:53:52.851Z
#15 12.89 
#15 12.89 ✘ [ERROR] Could not resolve "../../../../environments/environment"
#15 12.89 
#15 12.89     src/app/shared/services/auth.service.ts:6:28:
#15 12.89       6 │ import { environment } from '../../../../environments/environment';
#15 12.89         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
#15 12.89 
#15 12.89 
#15 12.89 ✘ [ERROR] TS2307: Cannot find module '../../../../environments/environment' or its corresponding type declarations. [plugin angular-compiler]
#15 12.89 
#15 12.89     src/app/shared/services/auth.service.ts:6:28:
#15 12.89       6 │ import { environment } from '../../../../environments/environment';
#15 12.89         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
#15 12.89 
#15 12.89 
#15 12.89 ✘ [ERROR] Could not resolve "../../../../environments/environment"
#15 12.89 
#15 12.89     src/app/shared/services/chatbot.service.ts:5:28:
#15 12.89       5 │ import { environment } from '../../../../environments/environment';
#15 12.89         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
#15 12.89 
#15 12.89 
#15 12.89 ✘ [ERROR] TS2307: Cannot find module '../../../../environments/environment' or its corresponding type declarations. [plugin angular-compiler]
#15 12.89 
#15 12.89     src/app/shared/services/chatbot.service.ts:5:28:
#15 12.89       5 │ import { environment } from '../../../../environments/environment';
#15 12.89         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
#15 12.89 
#15 12.89 
#15 12.89 ✘ [ERROR] Could not resolve "../../../../environments/environment"
#15 12.89 
#15 12.89     src/app/shared/services/consulta.service.ts:5:28:
#15 12.89       5 │ import { environment } from '../../../../environments/environment';
#15 12.89         ╵                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
#15 12.89 
#15 12.89 